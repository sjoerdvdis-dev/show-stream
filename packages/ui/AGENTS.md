# UI

The design system: tokens now, then shadcn primitives in Phase 2 item 3 and patterns in item 4. [`DESIGN.md`](../../DESIGN.md) at the root describes it, and `docs/PLAN.md` section 9 holds the direction.

```text
Tokens       src/styles/tokens.css: colors in both themes, fonts, radius
   ↓
Primitives   src/components: shadcn, still on Radix
   ↓
Patterns     src/patterns, from item 4
   ↓
Screens      thin route files in apps/web
```

- Two stylesheets ship, one per client. `tokens.css` is `apps/web`'s, exported as `@workspace/ui/tokens.css`. `globals.css` is the Next client's, and stays exactly as it is until item 8 deletes it with the Next client.
- A token change goes in `tokens.css`, then in `DESIGN.md`. `test/tokens.test.ts` checks contrast and the sRGB gamut, and `test/design-md.test.ts` fails when `DESIGN.md` and `tokens.css` disagree. Write colors as OKLCH.
- The accent is the block marked "The accent" in `tokens.css`. Everything else that uses it, such as `ring`, refers to `primary`.
- A new color token needs a pair in the contrast test, in both themes, and a row in `DESIGN.md`.
- Components and patterns use semantic tokens, such as `bg-card` or `text-destructive`, never raw colors. Icons come from `lucide-react` only.
- Primitives stay close to upstream shadcn, so that they can be updated. Add one with `pnpm dlx shadcn@latest add <name>` from this folder, after item 3 has moved `components.json` to Base UI. Until then, add no primitive.
- Every pattern handles loading, empty and error states, works by keyboard and at phone width, in dark and light.
- `apps/web` imports only the stylesheet until item 3. The Radix components, `next-themes` and `tailwindcss-animate` serve the Next client only.
