import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, ipcMain, Menu, screen, session, shell } from 'electron';
import type { ConnectChannel, ConnectResult } from './bridge';
import { normaliseAddress } from './address';
import { problemMessage } from './messages';
import { navigationRule } from './navigation';
import { checkServer, isCertificateError } from './server-check';
import { settingsStore, type WindowState } from './settings';
import { restoredBounds } from './window-state';

/** The window's session, kept on disk, so that the server's session cookie survives a restart. */
const partition = 'persist:showstream';
const connectChannel: ConnectChannel = 'showstream:connect';
const setupPage = join(__dirname, 'setup', 'index.html');
const setupPageUrl = pathToFileURL(setupPage).href;
/** Chromium's code for a navigation that was cancelled, such as by the navigation rule. */
const aborted = -3;

// `--user-data-dir` keeps a second profile, such as the browser tests' one, apart from the user's.
// It must be set before anything reads the folder, and the single-instance lock is per folder.
const userDataDir = app.commandLine.getSwitchValue('user-data-dir');
if (userDataDir) {
	app.setPath('userData', userDataDir);
}
// `pnpm dev` passes the dev server's address, which the setup page offers when none is saved.
const suggestedServer = app.commandLine.getSwitchValue('suggest-server') || undefined;

app.enableSandbox();

const withoutQuery = (url: string) => {
	if (!URL.canParse(url)) {
		return url;
	}
	const parsed = new URL(url);
	parsed.search = '';
	parsed.hash = '';
	return parsed.href;
};

const start = () => {
	const store = settingsStore(app.getPath('userData'));
	const windowSession = session.fromPartition(partition);
	// The saved address goes through the same rules as a typed one, in case the file was edited.
	const saved = normaliseAddress(store.read().server ?? '');
	let server = saved.ok ? saved.origin : undefined;

	// Nothing is granted but full screen, for the player, and only to the chosen server. Media keys
	// reach the page through the Media Session API, which asks for no permission.
	const isServer = (url: string) => navigationRule(url, server) === 'stay';
	windowSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
		callback(permission === 'fullscreen' && isServer(details.requestingUrl));
	});
	windowSession.setPermissionCheckHandler(
		(_contents, permission, requestingOrigin) => permission === 'fullscreen' && isServer(requestingOrigin),
	);

	const savedWindow = store.read().window;
	const bounds = restoredBounds(
		savedWindow?.bounds,
		screen.getAllDisplays().map((display) => display.workArea),
	);
	const mainWindow = new BrowserWindow({
		width: 1280,
		height: 800,
		...bounds,
		minWidth: 360,
		minHeight: 480,
		title: 'ShowStream',
		// The PWA's icon, which the build copies into `dist`. Windows uses the executable's own.
		icon: join(__dirname, 'icon.png'),
		show: false,
		webPreferences: {
			partition,
			preload: join(__dirname, 'preload.js'),
			// Electron's defaults, written out so that a change here is a visible one. Never loosen them:
			// apps/desktop/AGENTS.md says why.
			contextIsolation: true,
			nodeIntegration: false,
			nodeIntegrationInSubFrames: false,
			sandbox: true,
			webSecurity: true,
			allowRunningInsecureContent: false,
			webviewTag: false,
			// Chromium's spellchecker downloads its dictionaries from Google.
			spellcheck: false,
		},
	});
	if (savedWindow?.maximized) {
		mainWindow.maximize();
	}
	mainWindow.once('ready-to-show', () => mainWindow.show());

	const saveWindowState = () => {
		const state: WindowState = { bounds: mainWindow.getNormalBounds(), maximized: mainWindow.isMaximized() };
		store.update({ window: state });
	};
	mainWindow.on('close', saveWindowState);

	const showSetup = (query: { address?: string; message?: string }) => {
		const defined = Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined);
		void mainWindow.loadFile(setupPage, { query: Object.fromEntries(defined) });
	};
	const showServer = (origin: string) => void mainWindow.loadURL(`${origin}/`);

	// Every navigation, redirect, frame and new window goes through the navigation rule. Nothing but
	// the chosen server loads here, and other https: links open in the system browser.
	const contents = mainWindow.webContents;
	contents.on('will-frame-navigate', (event) => {
		const rule = navigationRule(event.url, server);
		if (rule === 'stay') {
			return;
		}
		event.preventDefault();
		if (rule === 'external' && event.isMainFrame) {
			void shell.openExternal(event.url);
		}
	});
	contents.on('will-redirect', (event) => {
		if (navigationRule(event.url, server) !== 'stay') {
			event.preventDefault();
		}
	});
	contents.setWindowOpenHandler(({ url }) => {
		const rule = navigationRule(url, server);
		if (rule === 'stay') {
			void contents.loadURL(url);
		} else if (rule === 'external') {
			void shell.openExternal(url);
		}
		return { action: 'deny' };
	});
	contents.on('will-attach-webview', (event) => event.preventDefault());

	// A server that is down, or whose certificate is no longer trusted, shows the setup page with
	// the reason, where Connect tries again and another address can be entered.
	contents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
		if (!isMainFrame || code === aborted || !server || !isServer(url)) {
			return;
		}
		showSetup({
			address: server,
			message: problemMessage(isCertificateError(description) ? 'certificate' : 'unreachable', server),
		});
	});

	ipcMain.handle(connectChannel, async (event, input: unknown): Promise<ConnectResult> => {
		if (event.sender !== contents || withoutQuery(event.senderFrame?.url ?? '') !== setupPageUrl) {
			throw new Error('Only the setup page may choose the server.');
		}
		const address = normaliseAddress(typeof input === 'string' ? input : '');
		if (!address.ok) {
			return { ok: false, message: problemMessage(address.problem) };
		}
		const check = await checkServer(address.origin, (url, init) => windowSession.fetch(url, init));
		if (!check.ok) {
			return { ok: false, message: problemMessage(check.problem, address.origin) };
		}
		server = address.origin;
		store.update({ server });
		showServer(server);
		return { ok: true };
	});

	const changeServer = () => {
		const previous = server;
		server = undefined;
		// Only the address is forgotten. The session and anything else the server's pages stored stay.
		store.update({ server: undefined });
		showSetup({ address: previous });
	};

	Menu.setApplicationMenu(
		Menu.buildFromTemplate([
			{
				label: 'File',
				submenu: [
					{ id: 'change-server', label: 'Change Server…', click: changeServer },
					{ type: 'separator' },
					{ role: 'quit' },
				],
			},
			{ role: 'editMenu' },
			// Reload, Force Reload, Developer Tools, zoom and Full Screen.
			{ role: 'viewMenu' },
		]),
	);

	app.on('second-instance', () => {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}
		mainWindow.focus();
	});

	if (server) {
		showServer(server);
	} else {
		showSetup({ address: suggestedServer });
	}
};

if (app.requestSingleInstanceLock()) {
	app.on('window-all-closed', () => app.quit());
	void app.whenReady().then(start);
} else {
	app.quit();
}
