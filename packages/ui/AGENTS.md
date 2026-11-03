# UI

The design system: the theme, shadcn primitives on Base UI, and the product patterns built on them. [`DESIGN.md`](../../DESIGN.md) at the root says what each color is for, and `docs/PLAN.md` section 9 holds the direction.

```text
Theme        src/styles/tokens.css: shadcn's CSS variables in both themes, fonts, radius
   ↓
Primitives   src/components: shadcn's base-nova style on Base UI
   ↓
Patterns     src/patterns: product components on the primitives
   ↓
Screens      thin route files in apps/web
```

## Theme

- The theme is shadcn's: CSS variables in `:root` and `.dark`, each mapped to a Tailwind color in `@theme inline`, and used through utilities such as `bg-card` or `text-destructive`. Never raw colors. `test/no-raw-colors.test.ts` checks the primitives.
- To switch the theme, paste a shadcn theme over the first `:root` and `.dark` blocks of `tokens.css`, or edit their values, then run `pnpm --filter @workspace/ui test`. Every variable has its own value in both themes, with no `var()` between them, so nothing overrides what you paste. Write colors as OKLCH.
- `test/tokens.test.ts` checks that the variable set matches a current shadcn theme, that each has a value in both themes and a Tailwind color, and contrast and the sRGB gamut for every color. When shadcn adds a variable, add it to the list in that test and to `tokens.css`.
- ShowStream's own colors, such as `success` and `overlay`, sit in their own `:root` and `.dark` blocks, as shadcn documents for new colors, and in `@theme inline`. A new one needs both themes, a contrast pair in the test, and a row in `DESIGN.md`.
- The accent appears in `primary`, `ring`, `chart-1`, `sidebar-primary` and `sidebar-ring`. Change them together.
- `src/styles/shadcn.css` is shadcn's own `tailwind.css`, copied from the `shadcn` package so that its CLI does not ship as a dependency. After a shadcn update, copy it again.
- `DESIGN.md` names each color's role, and points here for the values, so a value change needs no edit there.
- `tokens.css` keeps only base styles that use its variables. The primitives rely on the app's stylesheet to end animations at once under reduced motion, as `apps/web/src/index.css` does, so a new app must copy that rule.

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
- The Next client has its own copy of the old Radix primitives and stylesheet. Nothing here serves it.

## Patterns

- One file per group in `src/patterns`, exported as `@workspace/ui/patterns/<file>`, such as `@workspace/ui/patterns/media-card`. `docs/PLAN.md` section 9.5 lists them, and `/dev/components` in `apps/web` shows each one in its states. Add a new pattern there too.
- A pattern composes primitives and semantic tokens only, with classes merged by `cn()` and `className` passed through. `test/no-raw-colors.test.ts` checks `src/patterns` too. A new color goes in `tokens.css` the shadcn way, never in a pattern. No shadows, as `DESIGN.md` says. Icons come from `lucide-react` only.
- Props in, callbacks out. A pattern never fetches, routes or opens a socket. Links go through `AppLink` from `patterns/link`, which renders whatever the app gives `LinkProvider`, so nothing here depends on a router. Domain types, such as `TranscodeStatus`, come from `@workspace/contract` with `import type`.
- Every pattern that shows data has loading, empty and error states, through `loading`, `empty` and `error` props that compose `LoadingGrid`, `EmptyState` and `ErrorState` from `patterns/states`. Every loading state sits in `LoadingStatus`, which names it for assistive technology. A compact control, such as `FacetFilter`, shows small inline states instead of the page-sized `EmptyState` and `ErrorState`. `error` is always a failed load. A title's own failure is `failureReason`.
- `StatusBadge` is focusable only for a failure with a reason, so its tooltip opens by keyboard and a grid of cards gains no tab stop per card.
- A screen sorts and filters. `DataTable` and `FilterBar` only say what the user asked for.
- Every pattern works by keyboard, with visible focus, at 390px wide, in dark and light.
- `tokens.css` names `src/patterns` with `@source`, so that an app's Tailwind build sees their classes. A new folder of classes needs the same.
- `VideoPlayer` is the only place `hls.js` is used here. It takes `debug`, which an app sets from its build mode, and reports a 401 through `onUnauthorized`, so the app keeps one path back to login. Its shortcuts listen on the document, so a page shows one player. The controls are our own, not `media-chrome` ([ADR 0010](../../docs/adr/0010-own-player-controls-on-hls-js.md)).
- Tests in `test/components/patterns` render a pattern as a screen would, with props, and check by role, label and keyboard what a user sees. jsdom has no playback, so the player tests stub the media element and mock `hls.js`.
