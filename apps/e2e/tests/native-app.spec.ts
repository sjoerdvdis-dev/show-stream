import { lookup } from 'node:dns/promises';
import { mkdtempSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import electronPath from 'electron';

// The desktop app, apps/desktop, which `run.sh` builds before the stack starts. It runs after
// flow.spec.ts, which creates the owner and leaves the movie ready to play, and before
// proxy.spec.ts, whose last test uses up the login limit. Its tests share one profile, in order.
test.describe.configure({ mode: 'serial' });

const owner = { username: 'owner', password: 'correct horse battery' };
const movieId = 550001;
const movieTitle = 'Demo Movie';

const desktopApp = join(__dirname, '..', '..', 'desktop');
/** The app's user data, as a new install has it. Every launch below shares it, as restarts do. */
const profile = mkdtempSync(join(tmpdir(), 'showstream-desktop-'));

let app: ElectronApplication;
let page: Page;

const launch = async () => {
	app = await electron.launch({
		executablePath: electronPath as unknown as string,
		args: [
			desktopApp,
			`--user-data-dir=${profile}`,
			// The container has no setuid sandbox helper and no user namespaces. The page's own
			// `sandbox` setting, which the app sets, still holds.
			'--no-sandbox',
			'--disable-dev-shm-usage',
		],
	});
	page = await app.firstWindow();
};

const restart = async () => {
	await app.close();
	await launch();
};

test.afterAll(async () => {
	await app?.close();
});

const setupHeading = () => page.getByRole('heading', { name: 'Connect to your server' });
const addressField = () => page.getByLabel('Server address');

const connectTo = async (address: string) => {
	await addressField().fill(address);
	await page.getByRole('button', { name: 'Connect' }).click();
};

/** A plain web server on this computer, which answers like a router's page, and not like ShowStream. */
const notShowStream = async () => {
	const server = createServer((_request, response) => {
		response.writeHead(200, { 'Content-Type': 'text/html' });
		response.end('<!doctype html><title>Router</title>');
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	return server;
};

test('the desktop app starts on its setup page, and says what is wrong with a wrong address', async () => {
	await launch();
	await expect(setupHeading()).toBeVisible();
	const message = page.getByRole('alert');

	await connectTo('nowhere.invalid');
	await expect(message).toContainText('Could not reach https://nowhere.invalid.');

	await connectTo('http://caddy');
	await expect(message).toContainText('Use https://');

	let router: Server | undefined;
	try {
		router = await notShowStream();
		const { port } = router.address() as AddressInfo;
		await connectTo(`http://127.0.0.1:${port}/admin`);
		await expect(message).toContainText(`http://127.0.0.1:${port} answered, but it is not a ShowStream server.`);
	} finally {
		router?.close();
	}

	// Caddy's certificate names `caddy`, so its own IP address does not match it.
	const { address } = await lookup('caddy', { family: 4 });
	await connectTo(address);
	await expect(message).toContainText('has a certificate this computer does not trust');
	await expect(message).toContainText('trust its root certificate on this computer');

	await expect(setupHeading()).toBeVisible();
});

test("the server's address loads its login, where the owner logs in", async () => {
	await connectTo('caddy');

	await page.waitForURL('https://caddy/login');
	await page.getByLabel('Username').fill(owner.username);
	await page.getByLabel('Password').fill(owner.password);
	await page.getByRole('button', { name: 'Log in' }).click();

	await page.waitForURL('https://caddy/movies');
	await expect(page.getByRole('list', { name: 'Movies' }).getByRole('link', { name: movieTitle })).toBeVisible();
});

test("the server's pages get no Node and no bridge, and no permission but full screen", async () => {
	expect(
		await page.evaluate(() => ({
			bridge: 'showStream' in window,
			require: typeof (window as { require?: unknown }).require,
			process: typeof (window as { process?: unknown }).process,
			buffer: typeof (window as { Buffer?: unknown }).Buffer,
		})),
	).toEqual({ bridge: false, require: 'undefined', process: 'undefined', buffer: 'undefined' });

	expect(await page.evaluate(() => Notification.requestPermission())).toBe('denied');
	expect(await page.evaluate(async () => (await navigator.permissions.query({ name: 'geolocation' })).state)).toBe(
		'denied',
	);
});

test('a film plays over HLS, and fills the screen', async () => {
	await page.getByRole('list', { name: 'Movies' }).getByRole('link', { name: movieTitle }).click();
	await page.getByRole('button', { name: `Play ${movieTitle}` }).click();
	await page.waitForURL(`https://caddy/watch/${movieId}`);

	const video = page.locator('video');
	await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(3);
	const started = await video.evaluate(async (v: HTMLVideoElement) => {
		v.muted = true;
		await v.play();
		return v.currentTime;
	});
	await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(started);
	expect(await video.evaluate((v: HTMLVideoElement) => v.error)).toBeNull();

	await page.getByRole('button', { name: 'Full screen' }).click();
	await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
	await page.getByRole('button', { name: 'Exit full screen' }).click();
	await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
});

test('links to other sites open in the system browser, and never in the window', async () => {
	await app.evaluate(({ shell }) => {
		const opened: string[] = [];
		Object.assign(globalThis, { opened });
		shell.openExternal = async (url) => {
			opened.push(url);
		};
	});
	const opened = () => app.evaluate(() => (globalThis as unknown as { opened: string[] }).opened);
	const onServer = page.url();
	const follow = (href: string) =>
		page.evaluate((target) => {
			const link = document.createElement('a');
			link.href = target;
			link.textContent = target;
			document.body.append(link);
			link.click();
			link.remove();
		}, href);

	await follow('https://example.com/');
	await expect.poll(opened).toEqual(['https://example.com/']);

	// Anything but https: is refused, and does not open anywhere.
	await follow('http://example.com/');
	await follow('file:///etc/passwd');
	await page.evaluate(() => window.open('https://example.org/', '_blank'));
	await expect.poll(opened).toEqual(['https://example.com/', 'https://example.org/']);

	expect(page.url()).toBe(onServer);
	expect(app.windows()).toHaveLength(1);
	await expect(page.locator('video')).toBeVisible();
});

test('after a restart, the window opens on the server, logged in, where it was left', async () => {
	const bounds = { x: 40, y: 30, width: 1100, height: 700 };
	await app.evaluate(({ BrowserWindow }, wanted) => BrowserWindow.getAllWindows()[0]!.setBounds(wanted), bounds);

	await restart();

	await expect(page.getByRole('list', { name: 'Movies' }).getByRole('link', { name: movieTitle })).toBeVisible();
	expect(new URL(page.url()).origin).toBe('https://caddy');
	expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.getBounds())).toEqual(bounds);
});

test('Change Server returns to the setup page, which offers the old address, and forgets it', async () => {
	await app.evaluate(({ Menu }) => Menu.getApplicationMenu()!.getMenuItemById('change-server')!.click());

	await expect(setupHeading()).toBeVisible();
	await expect(addressField()).toHaveValue('https://caddy');
	expect(await page.evaluate(() => 'showStream' in window)).toBe(true);

	await restart();

	await expect(setupHeading()).toBeVisible();
});
