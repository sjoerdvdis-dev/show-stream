import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

/** @type {import('next').NextConfig} */
const nextConfig = {
	transpilePackages: ['@workspace/ui'],
	output: 'standalone',
	outputFileTracingRoot: path.join(__dirname, '../../'),
	images: {
		remotePatterns: [new URL('https://image.tmdb.org/t/p/**')],
	},
	async rewrites() {
		// Proxy to Backend API
		return [
			{
				source: '/api/:path*',
				destination: `${process.env.API_SERVER_URL}/:path*`,
			},
			{
				source: '/socket-api:path*',
				destination: `${process.env.API_SERVER_URL}/socket/socket-io:path*`,
			},
		];
	},
};

export default nextConfig;
