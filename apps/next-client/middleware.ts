import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

/**
 * Auth Middleware
 * calls /authenticate from API to verify token
 */

export async function middleware(request: NextRequest) {
	const cookieToken = request.cookies.get('authToken');

	// No token, redirect to /login
	if (!cookieToken) {
		return NextResponse.redirect(new URL('/login', request.url));
	}

	const token = cookieToken.value;
	const { valid, user } = (await verifyToken(token)) || {};

	// Token exists, but its invalid, so we delete it
	// And redirect to /login
	if (!valid || !user) {
		const response = NextResponse.redirect(new URL('/login', request.url));
		response.cookies.delete('authToken');
		return response;
	}

	// TODO: If /login and valid, redirect to /

	// Valid token, allow request
	return NextResponse.next();
}

/**
 * Skip:
 *  - /login
 *  - static files
 *  - image files
 *  - favicon.ico
 */
export const config = {
	matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
};
