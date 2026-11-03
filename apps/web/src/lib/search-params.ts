/**
 * How the router reads and writes the query string. Values stay text, and a list repeats its key,
 * as the API reads a query, so that `?genre=Drama&genre=Crime` is what a user sees and shares. Each
 * route's `validateSearch` turns the text into typed values, using the contract's schemas.
 */
export const parseSearch = (searchText: string): Record<string, string | string[]> => {
	const params = new URLSearchParams(searchText);
	const search: Record<string, string | string[]> = {};
	for (const key of new Set(params.keys())) {
		const values = params.getAll(key);
		search[key] = values.length > 1 ? values : values[0]!;
	}
	return search;
};

/** Leaves out `undefined`, `null` and empty lists, so a cleared value leaves the URL. */
export const stringifySearch = (search: Record<string, unknown>): string => {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(search)) {
		for (const item of Array.isArray(value) ? value : [value]) {
			if (item !== undefined && item !== null) {
				params.append(key, String(item));
			}
		}
	}
	const text = params.toString();
	return text ? `?${text}` : '';
};
