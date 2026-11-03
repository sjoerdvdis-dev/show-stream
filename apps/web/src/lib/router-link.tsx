import { Link, type LinkProps as RouterLinkProps } from '@tanstack/react-router';
import type { LinkComponent } from '@workspace/ui/patterns/link';

/**
 * The link the patterns in `@workspace/ui` navigate with, given to them by `LinkProvider` in the
 * root route. Patterns pass a path, such as `/movies/7`, that a screen built.
 */
export const RouterLink: LinkComponent = ({ href, ...props }) => <Link {...props} to={href as RouterLinkProps['to']} />;
