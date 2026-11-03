import { z } from 'zod';

/**
 * Zod compiles object schemas with `new Function` when it can, and finds out by trying, as each
 * schema is made. The Content-Security-Policy that Caddy sends forbids that, and even the try is a
 * violation. So `main.tsx` imports this first, before any module makes a schema.
 */
z.config({ jitless: true });
