import { createContext, createElement, use, type ComponentProps, type ComponentType, type ReactNode } from 'react';

/**
 * What a pattern hands the app's link. `href` is a path inside the app, such as `/movies/7`.
 * Patterns do not route, so the app supplies the link, and `packages/ui` does not depend on a router.
 */
export type LinkProps = Omit<ComponentProps<'a'>, 'href'> & { href: string };
export type LinkComponent = ComponentType<LinkProps>;

/** A plain `a`, the default, for links that stay off the app's router, such as hash links within a page. */
export const PlainLink: LinkComponent = ({ href, children, ...props }) => (
	<a href={href} {...props}>
		{children}
	</a>
);

const LinkContext = createContext<LinkComponent>(PlainLink);

/** Gives every pattern below it the app's link, such as one built on TanStack Router's `Link`. */
export const LinkProvider = ({ component, children }: { component: LinkComponent; children: ReactNode }) => (
	<LinkContext value={component}>{children}</LinkContext>
);

/** A link inside the app. Patterns use this for navigation, and it renders the app's link. */
export const AppLink = (props: LinkProps) => createElement(use(LinkContext), props);
