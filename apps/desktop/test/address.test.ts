import { describe, expect, it } from 'vitest';
import { normaliseAddress } from '../src/address';

const origin = (input: string) => {
	const address = normaliseAddress(input);
	return address.ok ? address.origin : address.problem;
};

describe('normaliseAddress', () => {
	it('adds https:// when no scheme is given', () => {
		expect(origin('media.example.com')).toBe('https://media.example.com');
		expect(origin('192.168.1.20')).toBe('https://192.168.1.20');
		expect(origin('media.example.com:8443')).toBe('https://media.example.com:8443');
		expect(origin('localhost')).toBe('https://localhost');
	});

	it('keeps only the origin, dropping a path, query and fragment', () => {
		expect(origin('https://media.example.com/movies/550001?page=2#top')).toBe('https://media.example.com');
		expect(origin('media.example.com/login')).toBe('https://media.example.com');
	});

	it('trims the input and lowers the case of the scheme and host', () => {
		expect(origin('  HTTPS://Media.Example.COM/  ')).toBe('https://media.example.com');
	});

	it('drops the default port', () => {
		expect(origin('https://media.example.com:443')).toBe('https://media.example.com');
	});

	it('allows http:// to localhost and 127.0.0.1 only', () => {
		expect(origin('http://localhost:5173')).toBe('http://localhost:5173');
		expect(origin('http://127.0.0.1:5173/movies')).toBe('http://127.0.0.1:5173');
		expect(origin('http://media.example.com')).toBe('insecure');
		expect(origin('http://192.168.1.20')).toBe('insecure');
		expect(origin('http://localhost.example.com')).toBe('insecure');
	});

	it('refuses an empty address', () => {
		expect(origin('')).toBe('empty');
		expect(origin('   ')).toBe('empty');
	});

	it('refuses what is not a web address', () => {
		expect(origin('ftp://media.example.com')).toBe('invalid');
		expect(origin('file:///etc/passwd')).toBe('invalid');
		expect(origin('javascript://alert(1)')).toBe('invalid');
		expect(origin('media example com')).toBe('invalid');
		expect(origin('https://')).toBe('invalid');
	});

	it('refuses an address with a user name or password', () => {
		expect(origin('https://owner:secret@media.example.com')).toBe('invalid');
		expect(origin('owner@media.example.com')).toBe('invalid');
	});
});
