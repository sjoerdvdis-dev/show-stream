import { ApiError, createApiClient } from '@workspace/api-client';

/** Next rewrites `/api` to the API, so that the session cookie is first-party. */
export const api = createApiClient('/api');

/** A full page load, so that nothing from the ended session stays in memory. */
export const returnToLogin = () => {
	window.location.assign('/login');
};

export const isSessionEnded = (error: unknown) => error instanceof ApiError && error.status === 401;

/** For the calls that do not use `api` yet. Any of them can find that the session has ended. */
export const fetchWithSession = async (url: string) => {
	const response = await fetch(url);
	if (response.status === 401) {
		returnToLogin();
	}
	return response;
};

export const fetcher = async (url: string) => {
	const response = await fetchWithSession(url);
	if (!response.ok) {
		throw new Error(`Request failed with ${response.status}`);
	}
	return response.json();
};
