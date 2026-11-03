# UI

The design system: the theme, shadcn primitives on Base UI, and patterns from Phase 2 item 4. [`DESIGN.md`](../../DESIGN.md) at the root says what each color is for, and `docs/PLAN.md` section 9 holds the direction.

```text
Theme        src/styles/tokens.css: shadcn's CSS variables in both themes, fonts, radius
   ↓
Primitives   src/components: shadcn's base-nova style on Base UI
   ↓
Patterns     src/patterns, from item 4
   ↓
Screens      thin route files in apps/web
```

## Theme

- The theme is shadcn's: CSS variables in `:root` and `.dark`, each mapped to a Tailwind color in `@theme inline`, and used through utilities such as `bg-card` or `text-destructive`. Never raw colors. `test/no-raw-colors.test.ts` checks the primitives.
- To switch the theme, paste a shadcn theme over the first `:root` and `.dark` blocks of `tokens.css`, or edit their values, then run `pnpm --filter @workspace/ui test`. Every variable has its own value in both themes, with no `var()` between them, so nothing overrides what you paste. Write colors as OKLCH.
- `test/tokens.test.ts` checks that the variable set matches a current shadcn theme, that each has a value in both themes and a Tailwind color, and contrast and the sRGB gamut for every color. When shadcn adds a variable, add it to the list in that test and to `tokens.css`.
- ShowStream's own colors, such as `success` and `overlay`, sit in their own `:root` and `.dark` blocks, as shadcn documents for new colors, and in `@theme inline`. A new one needs both themes, a contrast pair in the test, and a row in `DESIGN.md`.
- The accent appears in `primary`, `ring`, `chart-1`, `sidebar-primary` and `sidebar-ring`. Change them together.
- `DESIGN.md` names each color's role, and points here for the values, so a value change needs no edit there.

## Primitives

- Add one with `pnpm dlx shadcn@latest add <name>` from this folder, one commit per primitive. The CLI puts it in `src/components`.
  - It writes `import { cn } from "cn"`. Change that to `@workspace/ui/lib/utils`, which `test/cn-import.test.ts` checks.
  - A registry dependency that is already here makes the CLI ask before overwriting it. Answer no, or pass `--overwrite` and restore the customized files listed below with `git checkout`.
  - With `rsc: false` it should drop `"use client"`, but it adds it back when it updates a dependency. Leave it out.
  - Check the file for raw colors and for ESLint rules it breaks, and add a keyboard test in `test/components` for anything interactive.
- Primitives stay close to upstream, and the root `.prettierignore` keeps Prettier off `src/components` and `src/hooks`. `pnpm dlx shadcn@latest add <name> --diff` shows the differences. The only intended ones are:
  - `cn` from `@workspace/ui/lib/utils`, in every file.
  - `bg-overlay/10` for `bg-black/10` in `dialog`, `alert-dialog`, `sheet` and `drawer`, and `bg-background` for `bg-white` in `slider`.
  - `calendar` passes `ref` to its day button, which upstream base-nova drops, so focus follows the arrow keys.
  - `sonner` takes `theme` from the app, in place of `next-themes`.
  - `dual-range-slider` is not in the registry. It is the base-nova `slider` with a label on each thumb.
  - `field` replaces `form`, which the base styles do not have. Use it with react-hook-form's `Controller`.
- ESLint rules are off only in the upstream files that break them, listed in `eslint.config.js`.
- Base UI tabs activate manually: arrow keys move focus, and Enter or Space shows the panel.
- Component tests drive a primitive by role, label and keyboard, with `@testing-library/user-event`, and check what a user notices. `test/components/setup.ts` gives jsdom what Base UI and cmdk ask for.
- Every pattern handles loading, empty and error states, works by keyboard and at phone width, in dark and light. Icons come from `lucide-react` only.
- The Next client has its own copy of the old Radix primitives and stylesheet. Nothing here serves it.
