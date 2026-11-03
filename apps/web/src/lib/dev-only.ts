import { notFound } from '@tanstack/react-router';

/**
 * A `beforeLoad` for a page that only `pnpm dev` serves: in a build it answers as not found.
 * The route still picks its component with `import.meta.env.DEV` written out in its own file, so
 * that Vite folds the condition there and the build leaves the page out.
 */
export const devOnly = () => {
	// eslint-disable-next-line turbo/no-undeclared-env-vars -- Vite sets DEV, and it is false in a build.
	if (!import.meta.env.DEV) {
		throw notFound();
	}
};
