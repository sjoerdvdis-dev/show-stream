import { endpoints } from '@workspace/contract/endpoints';

export type ServerProblem = 'unreachable' | 'not-showstream' | 'certificate';

export type ServerCheck = { ok: true } | { ok: false; problem: ServerProblem };

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** How long a server has to answer before it counts as unreachable. */
export const checkTimeoutMs = 10_000;

/**
 * Chromium's certificate errors, which `net.fetch` reports in its message, such as
 * `net::ERR_CERT_AUTHORITY_INVALID`. Electron reports a TLS handshake with a server that is not
 * speaking TLS as `ERR_SSL_PROTOCOL_ERROR`, which is not about trust, so it counts as unreachable.
 */
const certificateError = /\bERR_CERT_[A-Z_]+\b/;

/** Whether a failed request failed because this computer does not trust the server's certificate. */
export const isCertificateError = (error: unknown) =>
	certificateError.test(error instanceof Error ? error.message : String(error));

/**
 * Asks `GET /api/auth/setup`, the one public route every ShowStream server answers, through the
 * same path a browser uses. Only an answer with its known shape counts as ShowStream. Redirects are
 * not followed, because the window would then load another address than the one saved.
 */
export const checkServer = async (origin: string, fetch: Fetch): Promise<ServerCheck> => {
	let response: Response;
	try {
		response = await fetch(`${origin}/api${endpoints.setupStatus.path}`, {
			headers: { Accept: 'application/json' },
			redirect: 'manual',
			signal: AbortSignal.timeout(checkTimeoutMs),
		});
	} catch (error) {
		return { ok: false, problem: isCertificateError(error) ? 'certificate' : 'unreachable' };
	}

	if (response.status !== 200) {
		return { ok: false, problem: 'not-showstream' };
	}
	try {
		endpoints.setupStatus.response.strict().parse(await response.json());
	} catch {
		return { ok: false, problem: 'not-showstream' };
	}
	return { ok: true };
};
