/** Served by the API, or the screens a return path must not lead back to. */
const notReturnable = /^\/(api|socket|streams|login|setup)(\/|$)/;

/**
 * The path to return to after login, or `undefined` if `value` is not a page of this app. Parsing
 * as the browser does catches `//host`, `/\host` and paths with hidden tabs or newlines.
 */
export const toReturnPath = (value: string) => {
	if (!value.startsWith('/')) return undefined;

	const { origin } = window.location;
	const url = new URL(value, origin);
	if (url.origin !== origin || notReturnable.test(url.pathname)) return undefined;

	return `${url.pathname}${url.search}${url.hash}`;
};
