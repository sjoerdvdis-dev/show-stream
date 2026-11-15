import type { AddressProblem } from './address';
import type { ServerProblem } from './server-check';

/** What the setup page says for each problem with an address, or with the server behind it. */
export const problemMessage = (problem: AddressProblem | ServerProblem, origin?: string): string => {
	const server = origin ?? 'The server';
	switch (problem) {
		case 'empty':
			return "Enter your server's address, such as media.example.com.";
		case 'invalid':
			return 'That is not a web address. Enter it as you would in a browser, such as media.example.com.';
		case 'insecure':
			return 'Use https://. Plain http:// is only allowed for localhost, so that your session never travels unencrypted.';
		case 'unreachable':
			return `Could not reach ${server}. Check the address, and that the server is running and reachable from this computer.`;
		case 'not-showstream':
			return `${server} answered, but it is not a ShowStream server. Check the address.`;
		case 'certificate':
			return `${server} has a certificate this computer does not trust. If your server uses Caddy's internal CA, trust its root certificate on this computer, as the self-hosting guide explains, then restart ShowStream and try again.`;
	}
};
