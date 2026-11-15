import { contextBridge, ipcRenderer } from 'electron';
import type { ConnectChannel, DesktopBridge } from './bridge';

const channel: ConnectChannel = 'showstream:connect';

// This runs before every page of the window, including the server's. Only the app's own setup page
// is a file, and only it gets the bridge. The main process checks the sender again.
if (location.protocol === 'file:') {
	const bridge: DesktopBridge = {
		connect: (address) => ipcRenderer.invoke(channel, String(address)),
	};
	contextBridge.exposeInMainWorld('showStream', bridge);
}
