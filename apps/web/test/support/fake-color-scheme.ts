type Scheme = 'light' | 'dark';

/**
 * The system's color scheme, which jsdom does not have. `set` changes it as the operating system
 * would, and tells every listener.
 */
export const fakeColorScheme = (initial: Scheme) => {
	const original = window.matchMedia;
	let scheme = initial;
	const lists: EventTarget[] = [];

	window.matchMedia = (media: string) => {
		const list = Object.defineProperties(new EventTarget(), {
			media: { value: media },
			matches: { get: () => media.includes(`prefers-color-scheme: ${scheme}`) },
		});
		lists.push(list);
		return list as unknown as MediaQueryList;
	};

	return {
		set: (next: Scheme) => {
			scheme = next;
			for (const list of lists) {
				list.dispatchEvent(new Event('change'));
			}
		},
		restore: () => {
			window.matchMedia = original;
		},
	};
};
