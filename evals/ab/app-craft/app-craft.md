# App craft: motion, feedback, phone and data limits

For screens people work in (mode `operate`: an app, a dashboard, a tool). The visual direction stays with `DESIGN.md`. Where this file and the craft floor's Motion line disagree (which properties may animate, how many moments), this file wins for these screens.

Distilled from Emil Kowalski's skills (MIT, github.com/emilkowalski/skills, commit 64eb3de). Lines marked "studio" are this plugin's own wording, where the source gives no rule.

## 1. Decide where motion goes

Run both gates on every candidate, before writing `DESIGN.md`. Most candidates fail, and "nothing here animates" is a valid result.

- **Frequency.** Used 100 times a day or started from the keyboard: no animation. Used tens of times a day (hover, list navigation, frequent toggles): close to imperceptible, or nothing. Occasional (dialogs, drawers, toasts, settings): standard. Rare or first time (onboarding, an empty state, a success): the only place for delight.
- **Purpose.** Name it in one word: feedback, spatial consistency, state indication, or preventing a jarring change. "It looks good" is not a purpose.
- **Data stays still.** What the user is reading or acting on does not move for style: no rows animating in when data loads, no numbers counting up on load, no chart redrawn from zero.
- **Budget.** At most 5 to 7 moments in a whole app, fewer per view. List up to 5 things you chose not to animate, and why.
- **State changes the user causes** (studio). When an action changes an item (marked done, moved, filtered out), the change is the animation: the changed element transitions its colour, opacity or position, and nothing else on the screen moves.

## 2. Tokens for the "Motion and feedback" section of DESIGN.md

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | entering, exiting, anything answering the user; the default |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | something already on screen that moves or morphs |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | drawers and sheets |
| press | `scale(0.97)`, 100 to 160 ms | every pressable control |
| small overlays | 125 to 200 ms | tooltips, small popovers |
| menus | 150 to 250 ms | dropdowns, selects |
| large overlays | 200 to 500 ms | dialogs, drawers, sheets; toasts 400 ms |
| entrance | from `scale(0.95)` to `scale(0.97)` with `opacity: 0` | never from `scale(0)` |
| stagger | 30 to 80 ms between items, under 300 ms in total, not uniform | occasional surfaces only |

Everything else stays under 300 ms. Hover and colour changes use plain `ease`. Exits are no slower than entrances and leave the way they came. Popovers and menus grow from their trigger; dialogs stay centred.

## 3. Acceptance criteria

Copy these into `spec.md`, drop the ones that do not apply to this build (say which, and why), and prove each with a test like any other criterion.

Motion and feedback
- **M1** Every pressable control answers on press: an `:active` style (the press token, or a colour change where scale would look wrong), on pointer down, not on release.
- **M2** An action that changes an item's state shows it with a transition of 300 ms or less on the changed element.
- **M3** Only `transform`, `opacity` and colour animate. No `transition: all`, no animated `width`, `height`, `margin`, `padding`, `top` or `left`, no `scale(0)`, no `ease-in`.
- **M4** Every `:hover` style sits inside `@media (hover: hover) and (pointer: fine)`.
- **M5** Under `prefers-reduced-motion: reduce`, movement goes and opacity and colour changes stay.
- **M6** Every control shows keyboard focus with `:focus-visible`, and nothing started from the keyboard animates.
- **M7** Anything the user can trigger twice in a second uses a transition, not a keyframe animation.

Phone
- **P1** The viewport meta has `viewport-fit=cover` and does not lock zoom. There is one `theme-color` meta per colour scheme, matching the top of the page.
- **P2** Controls have `touch-action: manipulation`, the tap highlight is transparent, and each control has its own press style.
- **P3** Inputs, selects and textareas are at least 16 px. Tap targets are at least 44 by 44 px; a small control gets an invisible hit area, not a bigger layout.
- **P4** An app shell uses `100dvh`, never `100vh`. Fixed bars pad with `env(safe-area-inset-*)`.

Data limits
- **D1** With the real data, nothing overflows sideways at 320 px, at 390 px, or at 200% browser zoom.
- **D2** Each text field has a decision: wrap what identifies the item, truncate secondary text with a way to read it all, clamp previews. Text columns have `min-width: 0`; emails, links and identifiers have `overflow-wrap: anywhere`. Numbers, amounts and dates are never truncated.
- **D3** Numbers that change or line up use `font-variant-numeric: tabular-nums`. Counts use plural rules, and numbers and dates go through `Intl`.
- **D4** Every list has an empty state, looks right with one item, and has a decision for many (paginate or virtualize).

## 4. Review

On the running app: press a control, trigger a state change, tab through the controls, and look at 390 and at 320 wide. A criterion from section 3 that fails is **important**. A layout that hides content or puts an action out of reach is a **blocker**.
