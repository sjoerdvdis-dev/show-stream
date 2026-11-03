---
name: ShowStream
description: A self-hosted media server whose interface stays quiet so that posters carry the color.
colors:
  dark-background: "oklch(0.145 0.012 265)"
  dark-card: "oklch(0.185 0.014 265)"
  dark-popover: "oklch(0.205 0.015 265)"
  dark-muted: "oklch(0.225 0.015 265)"
  dark-secondary: "oklch(0.255 0.016 265)"
  dark-border: "oklch(0.32 0.016 265)"
  dark-foreground: "oklch(0.97 0.004 265)"
  dark-muted-foreground: "oklch(0.74 0.014 265)"
  dark-primary: "oklch(0.8 0.145 70)"
  dark-primary-foreground: "oklch(0.2 0.04 60)"
  dark-destructive: "oklch(0.68 0.19 25)"
  dark-destructive-foreground: "oklch(0.16 0.03 25)"
  dark-success: "oklch(0.76 0.15 155)"
  dark-warning: "oklch(0.84 0.15 90)"
  dark-info: "oklch(0.74 0.12 240)"
  light-background: "oklch(0.985 0.002 265)"
  light-card: "oklch(1 0 265)"
  light-popover: "oklch(1 0 265)"
  light-muted: "oklch(0.955 0.005 265)"
  light-secondary: "oklch(0.945 0.005 265)"
  light-border: "oklch(0.895 0.007 265)"
  light-foreground: "oklch(0.2 0.015 265)"
  light-muted-foreground: "oklch(0.47 0.016 265)"
  light-primary: "oklch(0.5 0.115 60)"
  light-primary-foreground: "oklch(0.985 0.01 70)"
  light-destructive: "oklch(0.52 0.19 27)"
  light-destructive-foreground: "oklch(0.985 0.005 27)"
  light-success: "oklch(0.47 0.105 155)"
  light-warning: "oklch(0.5 0.105 75)"
  light-info: "oklch(0.48 0.115 245)"
  overlay: "oklch(0.145 0.012 265)"
  overlay-foreground: "oklch(0.97 0.004 265)"
typography:
  display:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  mono:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
rounded:
  sm: "0.35rem"
  md: "0.475rem"
  lg: "0.6rem"
  xl: "0.85rem"
spacing:
  gutter: "1rem"
  stack: "1rem"
  section: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  button-secondary:
    backgroundColor: "{colors.dark-secondary}"
    textColor: "{colors.dark-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  button-destructive:
    backgroundColor: "{colors.dark-destructive}"
    textColor: "{colors.dark-destructive-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  input:
    textColor: "{colors.dark-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  card:
    backgroundColor: "{colors.dark-card}"
    textColor: "{colors.dark-foreground}"
    rounded: "{rounded.lg}"
    padding: "1rem"
---

# Design System: ShowStream

Written with `/impeccable document` on 2026-11-03 from the shipped code: `packages/ui/src/styles/tokens.css` and the preview at `/dev/theme` in `apps/web`. The direction comes from `docs/PLAN.md` section 9.1. No one was available to name the qualitative language, so the North Star, the color names and the named rules below are proposals, not confirmed by the maintainer.

The frontmatter mirrors `tokens.css`, and `packages/ui/test/design-md.test.ts` fails when they differ. To change a token, edit `tokens.css`, then this file.

## Overview

**Creative North Star: "The Darkened Cinema"** _(proposed)_

The room goes dark so that the screen can glow. ShowStream's interface is a cool, near-black frame around posters and backdrops, which supply all the color a screen needs. One warm amber, like the lights of a cinema marquee, marks the action that matters. Everything else steps back: tonal surfaces instead of shadows, muted text for metadata, and status colors only where a status is real.

Dark is the first theme, and light is complete rather than an afterthought. The theme follows the system unless the user picks one, and it applies before the first paint, so a reload never flashes.

The interface is an operating tool: people browse a library and press Play. Precision and consistency matter more than expression, and the brand lives in the accent, the type and the quiet.

**Key Characteristics:**

- A cool neutral base at hue 265, in both themes.
- One warm accent, used for the main action, links and focus.
- Depth through tonal layers, never shadows.
- Geist Sans for the interface and Geist Mono for technical data, served by the install itself.
- Contrast checked by a test: 7:1 for body text on the page, 4.5:1 for every other text pair, 3:1 for status and focus.

## Colors

A cool, near-neutral blue-gray at hue 265 carries every surface, with one amber accent and four status colors. Values are OKLCH, all in the sRGB gamut. Hex values below are rounded conversions.

| Token | Role | Dark | Dark hex | Light | Light hex |
|---|---|---|---|---|---|
| `background` | The page | `oklch(0.145 0.012 265)` | `#080a0f` | `oklch(0.985 0.002 265)` | `#f9fafb` |
| `card` | Raised panels and cards | `oklch(0.185 0.014 265)` | `#101319` | `oklch(1 0 265)` | `#ffffff` |
| `popover` | Menus and dialogs | `oklch(0.205 0.015 265)` | `#14171e` | `oklch(1 0 265)` | `#ffffff` |
| `muted` | Quiet fills, empty art | `oklch(0.225 0.015 265)` | `#181c23` | `oklch(0.955 0.005 265)` | `#eef0f4` |
| `secondary` | Secondary buttons, hover fills | `oklch(0.255 0.016 265)` | `#1f232b` | `oklch(0.945 0.005 265)` | `#ebedf0` |
| `border` | Lines and field strokes | `oklch(0.32 0.016 265)` | `#2f333b` | `oklch(0.895 0.007 265)` | `#dadce1` |
| `foreground` | Text | `oklch(0.97 0.004 265)` | `#f4f5f8` | `oklch(0.2 0.015 265)` | `#13161d` |
| `muted-foreground` | Metadata and hints | `oklch(0.74 0.014 265)` | `#a6abb4` | `oklch(0.47 0.016 265)` | `#565b64` |
| `primary` | The accent | `oklch(0.8 0.145 70)` | `#f9ac46` | `oklch(0.5 0.115 60)` | `#915006` |
| `primary-foreground` | Text on the accent | `oklch(0.2 0.04 60)` | `#231103` | `oklch(0.985 0.01 70)` | `#fff9f3` |
| `destructive` | Errors, and actions that cannot be undone | `oklch(0.68 0.19 25)` | `#f75d59` | `oklch(0.52 0.19 27)` | `#be2323` |
| `destructive-foreground` | Text on destructive | `oklch(0.16 0.03 25)` | `#180807` | `oklch(0.985 0.005 27)` | `#fdf9f8` |
| `success` | Ready, done | `oklch(0.76 0.15 155)` | `#52cd86` | `oklch(0.47 0.105 155)` | `#196c40` |
| `warning` | In progress, needs attention | `oklch(0.84 0.15 90)` | `#f0c543` | `oklch(0.5 0.105 75)` | `#865901` |
| `info` | Neutral news, queued | `oklch(0.74 0.12 240)` | `#5cb4ef` | `oklch(0.48 0.115 245)` | `#0e629a` |
| `overlay` | Scrim over posters and video, in both themes | `oklch(0.145 0.012 265)` | `#080a0f` | `oklch(0.145 0.012 265)` | `#080a0f` |
| `overlay-foreground` | Text on the scrim, in both themes | `oklch(0.97 0.004 265)` | `#f4f5f8` | `oklch(0.97 0.004 265)` | `#f4f5f8` |

These follow other tokens, in both themes: `card-foreground`, `popover-foreground` and `secondary-foreground` are `foreground`. The shadcn names map too: `accent` is `secondary`, `accent-foreground` is `secondary-foreground`, `input` is `border`, and `ring` is `primary`.

### Primary

- **Marquee Amber** (`primary`): the main action on a screen, such as Play, plus links and the focus ring. Bright amber on dark, and a deep burnt amber on light, so that text on it reads at 4.5:1 or better.

### Neutral

- **Projection Black** (`background`, dark): the room around the screen. **Paper Gray** (`background`, light) is its daytime counterpart.
- **Stage Gray** (`card`, `popover`, `muted`, `secondary`): three steps of lift, each a little lighter in dark mode, for panels, menus and quiet fills.
- **Screen White** (`foreground`) and **Credits Gray** (`muted-foreground`): text, and the metadata under it.
- **Seam Gray** (`border`): the lines between things, and the stroke of a field.

### Status

- **Green Light** (`success`), **Amber Signal** (`warning`), **Cool Blue** (`info`) and **Red Alert** (`destructive`). Status colors appear as text, a dot or an icon on any surface, at 3:1 or better.

### Named Rules

**The One Warm Light Rule.** `primary` is the only warm color in the chrome. Use it for the main action of a screen and for focus, not for decoration, so that the eye finds Play first.

**The Poster Owns the Color Rule.** Surfaces stay neutral at hue 265. Color comes from artwork, and from status only when there is a status to report.

**The One Place Rule.** The accent is the block marked "The accent" in `tokens.css`. Change it there, and `ring` and every accent use follow. The contrast test checks the result.

## Typography

**Display Font:** Geist Variable (with `ui-sans-serif`, `system-ui`, `sans-serif`)
**Body Font:** Geist Variable
**Label/Mono Font:** Geist Mono Variable (with `ui-monospace`, `monospace`)

**Character:** One neutral, precise grotesque for everything people read, and its monospaced sibling for technical facts. Both come from `@fontsource-variable` and are bundled by Vite, so the install serves them and no font CDN is asked.

### Hierarchy

- **Display** (600, 1.875rem, tight tracking): a page title on a large screen, such as the preview's heading.
- **Headline** (600, 1.5rem): the heading of a single-purpose page, such as login and setup.
- **Title** (600, 1.25rem): section headings.
- **Body** (400, 1rem, line-height 1.5): running text and form fields. Keep descriptions to about 65ch.
- **Label** (500, 0.875rem): buttons, field labels, metadata.
- **Mono** (400, 0.875rem): codecs, resolutions, timecodes, paths and other values a person might compare or copy. Use `tabular-nums` where digits line up.

### Named Rules

**The Mono Means Data Rule.** Geist Mono is for measured values only, never for a "technical" look.

## Layout

Single-column screens centered in a container, with a `1rem` side gutter at every width. Signed-in screens cap at `56rem`, forms at `24rem`, and the preview at `72rem`. Grids step from one column on phones to two at `640px` and three at `1024px`, which are Tailwind's `sm` and `lg`. Sections are `3rem` apart, and related items `0.5rem` to `1rem`. Everything works at 390px wide with no horizontal scroll.

## Elevation & Depth

Flat. There are no shadows. Depth comes from tonal steps: `background`, then `card`, then `popover`, each a little lighter in dark mode, with a `border` line where two surfaces meet. Over artwork, depth comes from the `overlay` scrim.

**The Tonal Lift Rule.** To raise a surface, move it one step up the neutral scale and give it a border. Never add a shadow.

**The Scrim Rule.** Text over a poster sits on `overlay` at 75% or stronger, usually as a gradient from the bottom. At 75% over a white poster, `overlay-foreground` still reads at 4.5:1, which the contrast test checks. `overlay` at 25% only dims art, and carries no text.

## Shapes

Gently rounded corners from one radius, `0.6rem` (`--radius`). Steps derive from it: small (`0.35rem`) for tight elements, medium (`0.475rem`) for buttons and fields, large (`0.6rem`) for cards and posters, extra large (`0.85rem`) for large panels. Borders are 1px in `border`. Posters keep the 2:3 ratio and clip to the large radius.

## Components

Primitives move to Base UI in Phase 2 item 3, and patterns arrive in item 4. Until then, these are the plain elements `apps/web` and the preview use.

### Buttons

- **Shape:** medium radius (`0.475rem`).
- **Primary:** `primary` with `primary-foreground`, label type, `0.5rem 0.75rem` padding. One per screen.
- **Secondary:** `secondary` with `secondary-foreground`, for the other actions.
- **Outline:** a `border` stroke on a transparent fill, for a quiet alternative.
- **Destructive:** `destructive` with `destructive-foreground`, only for what cannot be undone.
- **Disabled:** 60% opacity.
- **Focus:** the global ring.

### Cards / Containers

- **Corner Style:** large radius (`0.6rem`).
- **Background:** `card`, with `card-foreground` text.
- **Shadow Strategy:** none. See Elevation & Depth.
- **Border:** 1px `border`.
- **Internal Padding:** `1rem`.

### Inputs / Fields

- **Style:** a 1px `input` stroke on a transparent fill, medium radius, `0.5rem 0.75rem` padding.
- **Focus:** the global ring.
- **Error:** the stroke turns `destructive`, and the message below it is `destructive` text at label size.

### Focus ring

Every focusable element shows a 2px `ring` outline, offset by 2px, on `:focus-visible`. It is the accent, so it reads at 3:1 or better on every surface.

### Browser surfaces

Text selection is the accent at 30%. The caret, checkboxes and other native controls take the accent, and scrollbars use `border` on a transparent track. `color-scheme` follows the theme, so native controls and the canvas match it.

## Do's and Don'ts

### Do:

- **Do** use the semantic utilities, such as `bg-card`, `text-muted-foreground` and `border-border`, for every color.
- **Do** keep one `primary` action per screen.
- **Do** show status with `success`, `warning`, `info` or `destructive`, paired with a word or icon, never color alone.
- **Do** put text over artwork on `overlay` at 75% or stronger.
- **Do** check new screens in both themes, at 390px and 1280px, by keyboard.

### Don't:

- **Don't** use raw colors such as `text-red-500`, hex values or `bg-black` in `apps/web`. A test fails on them.
- **Don't** add shadows. Raise a surface with a tonal step and a border.
- **Don't** add a second accent or tint surfaces with color.
- **Don't** load fonts from a CDN. They ship with the app.
- **Don't** set a `dark` class on anything but `<html>`, except to preview a theme. The theme provider owns it.
