import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

/** @type {import('next').NextConfig} */
const nextConfig = {
	output: 'standalone',
	outputFileTracingRoot: path.join(__dirname, '../../'),
	images: {
		remotePatterns: [new URL('https://image.tmdb.org/t/p/**')],
	},
	async rewrites() {
		// Only `pnpm dev`, which has no Caddy. A built client has no route to the API, so that nothing
		// can pass on a client's own X-Forwarded-For.
		if (process.env.NODE_ENV !== 'development') {
			return [];
		}
		return [
			{
				source: '/api/:path*',
				destination: `${process.env.API_SERVER_URL}/:path*`,
			},
			{
				source: '/socket',
				destination: `${process.env.API_SERVER_URL}/socket/socket-io`,
			},
		];
	},
};

export default nextConfig;
