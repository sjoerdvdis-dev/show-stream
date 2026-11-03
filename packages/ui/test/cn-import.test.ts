import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

/**
 * Primitives merge classes with `cn` from `@workspace/ui/lib/utils`, the one place that chooses how.
 * `shadcn add` writes `import { cn } from "cn"`, which this catches.
 */
const folder = path.resolve(import.meta.dirname, '../src/components');
const components = readdirSync(folder).filter((file) => file.endsWith('.tsx'));

it.each(components)('%s takes cn from @workspace/ui/lib/utils', (file) => {
	const text = readFileSync(path.join(folder, file), 'utf8');
	expect(text).not.toMatch(/from ["']cn["']/);
});
