import { describe, expect, it } from 'vitest';
import { navigationRule } from '../src/navigation';

const server = 'https://media.example.com';

describe('navigationRule', () => {
	it("keeps every page of the chosen server's origin in the window", () => {
		expect(navigationRule('https://media.example.com/', server)).toBe('stay');
		expect(navigationRule('https://media.example.com/watch/550001?t=10#player', server)).toBe('stay');
		expect(navigationRule('https://MEDIA.example.com:443/login', server)).toBe('stay');
	});

	it('opens other https: links in the system browser', () => {
		expect(navigationRule('https://www.themoviedb.org/movie/550', server)).toBe('external');
		expect(navigationRule('https://media.example.com.evil.example/', server)).toBe('external');
		expect(navigationRule('https://media.example.com:8443/', server)).toBe('external');
	});

	it('denies http: to another origin, even the same host', () => {
		expect(navigationRule('http://media.example.com/', server)).toBe('deny');
		expect(navigationRule('http://example.com/', server)).toBe('deny');
	});

	it('denies every other scheme', () => {
		for (const url of [
			'file:///etc/passwd',
			'javascript:alert(1)',
			'data:text/html,<p>hi</p>',
			'mailto:owner@example.com',
			'ms-settings:',
			'smb://nas/media',
			'chrome://settings',
		]) {
			expect(navigationRule(url, server), url).toBe('deny');
		}
	});

	it('denies a link with a user name or password, which a browser would hide', () => {
		expect(navigationRule('https://owner:secret@example.com/', server)).toBe('deny');
	});

	it('denies what is not a URL', () => {
		expect(navigationRule('not a url', server)).toBe('deny');
		expect(navigationRule('', server)).toBe('deny');
	});

	it('keeps nothing in the window while no server is chosen', () => {
		expect(navigationRule('https://media.example.com/', undefined)).toBe('external');
		expect(navigationRule('file:///setup/index.html', undefined)).toBe('deny');
	});

	it('keeps a localhost server in the window, over http: too', () => {
		expect(navigationRule('http://localhost:5173/movies', 'http://localhost:5173')).toBe('stay');
		expect(navigationRule('http://localhost:5000/', 'http://localhost:5173')).toBe('deny');
	});
});
