Task: behaviour pass on a screen that is already designed and built (`UI: yes`). Work directly in this folder, on the current branch.

Add the behaviour below to the existing screen. Do not change the layout, the colours, the type, the copy or the structure. At rest, on a desktop width and on a phone width, the screen must look exactly as it does now: no element may move or change size. If a criterion cannot be met without changing the layout, leave it and say so in your report.

Tokens (add them next to the existing tokens and reuse them; if the project already has an easing or duration token that does the same job, use the project's):

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | entering, exiting, anything answering the user; the default |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | something already on screen that moves or morphs |
| press | `scale(0.97)`, 100 to 160 ms | every pressable control |

Everything stays under 300 ms. Hover and colour changes use plain `ease`.

Acceptance criteria (prove each with a test, like any other criterion):

- **M1** Every pressable control answers on press: an `:active` style (the press token, or a colour change where scale would look wrong), on pointer down, not on release.
- **M2** An action that changes an item's state shows it with a transition of 300 ms or less on the changed element. Nothing else on the screen moves, and data the user is reading does not animate on load.
- **M3** Only `transform`, `opacity` and colour animate. No `transition: all`, no animated `width`, `height`, `margin`, `padding`, `top` or `left`, no `scale(0)`, no `ease-in`.
- **M4** Every `:hover` style sits inside `@media (hover: hover) and (pointer: fine)`.
- **M5** Under `prefers-reduced-motion: reduce`, movement goes and opacity and colour changes stay.
- **M6** Every control shows keyboard focus with `:focus-visible`, and nothing started from the keyboard animates.
- **M7** Anything the user can trigger twice in a second uses a transition, not a keyframe animation.
- **P1** The viewport meta has `viewport-fit=cover` and does not lock zoom. There is one `theme-color` meta per colour scheme, matching the colour at the top of the page.
- **P2** Controls have `touch-action: manipulation`, the tap highlight is transparent, and each control has its own press style.

Verification: the command in `.studio/verify`, which must stay green.

<!-- Rules distilled from Emil Kowalski's skills (MIT, github.com/emilkowalski/skills, commit 64eb3de). M2's second sentence is this plugin's own wording. Tested on eval 021 as written: do not move these criteria into spec.md or DESIGN.md. -->
