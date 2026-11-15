import { describe, expect, it } from 'vitest';
import { checkServer, isCertificateError } from '../src/server-check';

const server = 'https://media.example.com';

/** A fetch that answers every request with this, and remembers what it was asked. */
const answering = (answer: () => Response | Promise<Response>) => {
	const requests: { url: string; init: RequestInit }[] = [];
	const fetch = async (url: string, init: RequestInit) => {
		requests.push({ url, init });
		return answer();
	};
	return { fetch, requests };
};

const failing = (message: string) => async () => {
	throw new Error(message);
};

describe('checkServer', () => {
	it("accepts a server whose setup route answers with its known shape, and doesn't follow redirects", async () => {
		const { fetch, requests } = answering(() => Response.json({ needed: false }));

		expect(await checkServer(server, fetch)).toEqual({ ok: true });
		expect(requests).toHaveLength(1);
		expect(requests[0]?.url).toBe('https://media.example.com/api/auth/setup');
		expect(requests[0]?.init.redirect).toBe('manual');
		expect(requests[0]?.init.signal).toBeInstanceOf(AbortSignal);
	});

	it('accepts a new server that still needs its owner', async () => {
		expect(await checkServer(server, answering(() => Response.json({ needed: true })).fetch)).toEqual({ ok: true });
	});

	it('says a server that answers with another shape is not ShowStream', async () => {
		for (const body of [{}, { needed: 'no' }, { needed: false, extra: 1 }, [], null]) {
			expect(await checkServer(server, answering(() => Response.json(body)).fetch), JSON.stringify(body)).toEqual({
				ok: false,
				problem: 'not-showstream',
			});
		}
	});

	it('says a server that answers with HTML, an error or a redirect is not ShowStream', async () => {
		const answers = [
			() => new Response('<!doctype html><title>Router</title>', { headers: { 'Content-Type': 'text/html' } }),
			() => new Response('Not found', { status: 404 }),
			() => Response.json({ needed: false }, { status: 500 }),
			() => new Response(null, { status: 302, headers: { Location: 'https://elsewhere.example/' } }),
		];
		for (const answer of answers) {
			expect(await checkServer(server, answering(answer).fetch)).toEqual({ ok: false, problem: 'not-showstream' });
		}
	});

	it('tells a certificate this computer does not trust from a server it cannot reach', async () => {
		for (const error of [
			'net::ERR_CERT_AUTHORITY_INVALID',
			'net::ERR_CERT_COMMON_NAME_INVALID',
			'net::ERR_CERT_DATE_INVALID',
		]) {
			expect(await checkServer(server, failing(error)), error).toEqual({ ok: false, problem: 'certificate' });
		}
		for (const error of [
			'net::ERR_NAME_NOT_RESOLVED',
			'net::ERR_CONNECTION_REFUSED',
			'net::ERR_SSL_PROTOCOL_ERROR',
			'The operation was aborted due to timeout',
		]) {
			expect(await checkServer(server, failing(error)), error).toEqual({ ok: false, problem: 'unreachable' });
		}
	});
});

describe('isCertificateError', () => {
	it("reads a load failure's description too", () => {
		expect(isCertificateError('ERR_CERT_AUTHORITY_INVALID')).toBe(true);
		expect(isCertificateError('ERR_CONNECTION_REFUSED')).toBe(false);
	});
});
