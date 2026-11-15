/**
 * The one function the preload gives the setup page, and nothing else. Types only, because a
 * sandboxed preload can load no file of its own.
 */
export type ConnectChannel = 'showstream:connect';

export type ConnectResult = { ok: true } | { ok: false; message: string };

export interface DesktopBridge {
	/** Checks the address, and on success saves it and loads the server in the window. */
	connect: (address: string) => Promise<ConnectResult>;
}
