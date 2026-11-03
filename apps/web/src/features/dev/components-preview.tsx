import { Blocks, LayoutTemplate, Palette } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import { AppShell } from '@workspace/ui/patterns/app-shell';
import { LinkProvider, PlainLink } from '@workspace/ui/patterns/link';
import { PageContainer, PageHeader } from '@workspace/ui/patterns/page';
import { PatternsSection } from './patterns-preview';
import { PrimitivesSection } from './primitives-preview';
import { Layer } from './section';
import { ThemeSection } from './theme-preview';
import { ThemeSwitch } from './theme-switch';

/**
 * Every layer of the design system on one page: the theme, the primitives and the patterns, in the
 * theme chosen here. Only `pnpm dev` serves it, at `/dev/components`. Keep this module free of
 * top-level side effects, or the build keeps them.
 */

const layers = [
	{ id: 'theme', label: 'Theme', icon: Palette },
	{ id: 'primitives', label: 'Primitives', icon: Blocks },
	{ id: 'patterns', label: 'Patterns', icon: LayoutTemplate },
];

const subscribeToHash = (onChange: () => void) => {
	window.addEventListener('hashchange', onChange);
	return () => window.removeEventListener('hashchange', onChange);
};

export const ComponentsPreview = () => {
	const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash);
	const items = layers.map(({ id, label, icon }) => ({ href: `#${id}`, label, icon, active: hash === `#${id}` }));

	// The page loads lazily, after the browser looked for the hash, so scroll to it once it is here.
	useEffect(() => {
		if (window.location.hash) {
			document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
		}
	}, []);

	// The fixtures link within this page, so a plain link keeps them off the router.
	return (
		<LinkProvider component={PlainLink}>
			<AppShell
				label="Layers"
				items={items}
				brand={<span className="font-semibold">Components</span>}
				footer={
					<div className="group-data-[collapsible=icon]:hidden">
						<ThemeSwitch />
					</div>
				}
			>
				<PageContainer>
					<PageHeader
						title="Components"
						description={
							<>
								The theme, every primitive and every pattern in <code className="font-mono text-sm">@workspace/ui</code>
								, from fixture data. Only <code className="font-mono text-sm">pnpm dev</code> serves this page.
							</>
						}
						actions={<ThemeSwitch />}
					/>
					<Layer
						id="theme"
						title="Theme"
						description={
							<>
								The tokens in <code className="font-mono text-sm">tokens.css</code>, the fonts and the radius.
							</>
						}
					>
						<ThemeSection />
					</Layer>
					<Layer id="primitives" title="Primitives" description="shadcn's base-nova style on Base UI.">
						<PrimitivesSection />
					</Layer>
					<Layer
						id="patterns"
						title="Patterns"
						description="Product components on the primitives. They take data through props, and show their loading, empty and error states."
					>
						<PatternsSection />
					</Layer>
				</PageContainer>
			</AppShell>
		</LinkProvider>
	);
};
