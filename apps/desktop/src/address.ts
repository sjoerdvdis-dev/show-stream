/** Hosts that may be reached over plain HTTP, because the traffic never leaves this computer. */
const loopbackHosts = new Set(['localhost', '127.0.0.1']);

export type AddressProblem = 'empty' | 'invalid' | 'insecure';

export type Address = { ok: true; origin: string } | { ok: false; problem: AddressProblem };

/**
 * What a user typed, as the origin of a server: `https://` when no scheme is given, and no path,
 * query or fragment. Plain `http://` is refused unless the host is this computer, so that the
 * session cookie never travels in clear.
 */
export const normaliseAddress = (input: string): Address => {
	const typed = input.trim();
	if (!typed) {
		return { ok: false, problem: 'empty' };
	}

	const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(typed) ? typed : `https://${typed}`;
	if (!URL.canParse(withScheme)) {
		return { ok: false, problem: 'invalid' };
	}

	const url = new URL(withScheme);
	if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname || url.username || url.password) {
		return { ok: false, problem: 'invalid' };
	}
	if (url.protocol === 'http:' && !loopbackHosts.has(url.hostname)) {
		return { ok: false, problem: 'insecure' };
	}

	return { ok: true, origin: url.origin };
};
