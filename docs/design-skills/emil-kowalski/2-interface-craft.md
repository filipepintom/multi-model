# Interface craft rules extracted from the Emil Kowalski skills (MIT)

Sources, all read in full: emil-design-eng, review-animations (SKILL and STANDARDS), improve-animations (SKILL, AUDIT, PLAN-TEMPLATE), remove-animations, apple-design, ui-cheatsheet. Rules are paraphrased. Source tags are in parentheses. "(cheatsheet)" means ui-cheatsheet.md. Where a file only defers to a skill that was not supplied (choreograph, animation-performance, find-animation-opportunities), that is noted and nothing is guessed.

Note on volume: these files are mostly about motion. The non-animation craft rules are few, and they are all listed in section 2.

---

## 1. Principles that decide (DESIGN)

1. Taste is trained, not personal preference: before shipping a component, name why the best interfaces do it differently, and inspect real examples. Test: can you defend each value as a deliberate choice? (emil-design-eng; apple-design 16.7)
2. Unseen details compound: a feature that works exactly as assumed is the goal. Test: would the user proceed without a second thought? (emil-design-eng)
3. Beauty is leverage: good defaults and polish differentiate tools whose features are equal. Test: is the default state already excellent without options? (emil-design-eng)
4. Good defaults beat options: most users never customise. Test: does it look right with zero configuration? (emil-design-eng, Sonner 2)
5. Handle edge cases invisibly: pause toast timers when the tab is hidden, fill gaps between stacked toasts with pseudo-elements so hover holds, capture pointer events during drag. Test: does the edge case cause no visible glitch? (emil-design-eng, Sonner 4)
6. Frequency decides whether to animate: 100+ per day (keyboard shortcuts, command palette toggle) means no animation; tens per day (hover, list navigation) means remove or drastically reduce; occasional (modals, drawers, toasts) means standard; rare or first-time (onboarding, feedback forms, celebrations) can have delight. Test: how often does one user see this per day? (emil-design-eng; review-animations; improve-animations)
7. Purpose gate: every animation must answer "why does it animate?" with one of spatial consistency, state indication, explanation, feedback, or preventing a jarring change. "It looks cool" on a frequently seen element fails. Test: name the purpose in one phrase. (emil-design-eng; review-animations 1)
8. Burden of proof is on the motion: an animation stays only if it passes the gate; "it's already there" and "it looks nice" are not defences. Test: run the gate tree (section 5). (remove-animations)
9. Deleting everything is also wrong: motion that bridges a jarring change (a toast that would teleport in, a panel that must show where it came from) earns its place. Test: would removal make the change disorienting? (remove-animations)
10. Perceived speed matters as much as real speed: a faster spinner, a 180ms select instead of 400ms, instant adjacent tooltips all make the app feel faster at identical load time. Test: does anything on the input path add delay that is not essential? (emil-design-eng; apple-design 1)
11. Match motion to personality: playful can be bouncier; a professional dashboard is crisp and fast. Test: does the motion fit the component's mood and the rest of the product? (emil-design-eng Cohesion; review-animations 10)
12. Decoration versus function: a decorative interaction (mouse-tracking spring) is fine; the same on a functional graph in a banking app should be no animation. Test: does it serve a function or only decorate? (emil-design-eng)
13. Slow where the user is deciding, fast where the system responds. Test: is the deliberate phase slower than the response phase? (emil-design-eng; review-animations 9)
14. Response first: when lag appears the feeling of directness collapses; respond on pointer-down, not on release; feedback must be continuous during a drag, not only at the end. Test: does anything visible happen on pointer-down? (apple-design 1)
15. Interruptibility is the single most important motion principle: never lock out input during a transition; the user can grab and reverse at any time. Test: can the user redirect it mid-flight without waiting? (apple-design 3)
16. Spatial consistency: what leaves one way should return the same way; anchor menus, popovers and sheets to their trigger. Test: does exit retrace enter? (apple-design 7; emil-design-eng)
17. Apple's eight principles as reasoning labels: Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity (not minimalism), Craft, Delight. Delight is the result of the other seven, not confetti on top. Test: see section 6. (apple-design 16)
18. Interaction and visuals are designed together; motion is not a layer added after the pixels. Test: could you tell where visuals end and interaction begins? You should not be able to. (apple-design 17)
19. Prototype interactively, test with real people, review with fresh eyes the next day; play motion in slow motion or frame by frame. Test: was it reviewed after a night, and at 2x to 5x duration? (emil-design-eng; apple-design 17)
20. When unsure whether motion feels right, the strongest move is often to delete it. Test: does the UI feel better with the animation turned off? (review-animations 10; remove-animations)
21. Remedial order when fixing motion: delete, reduce, fix easing, fix origin or physicality, make interruptible, move to GPU properties, asymmetric timing, polish, accessibility and cohesion. Test: did you try the earlier options first? (review-animations)
22. Do not re-litigate documented deliberate tradeoffs; respect and note them. (improve-animations hard rule 5; remove-animations hard rule 4)
23. Naming creates identity: sacrifice discoverability for memorability when appropriate. Low relevance to screens; see section 8. (emil-design-eng Sonner 3)

---

## 2. Interface craft beyond motion (DESIGN and IMPLEMENT)

### Surfaces and depth
- Build nav bars, toolbars and sheets as translucent layers (`backdrop-filter: blur(20px) saturate(180%)` with `background: rgba(255,255,255,0.6)`) with content scrolling underneath, instead of opaque bars that eat a fixed strip. (apple-design 12)
- Give a translucent toolbar a bright top edge: `border-top: 1px solid rgba(255,255,255,0.4)`, to read as light catching the material. (apple-design 12)
- Material weight encodes hierarchy: darker or heavier for structural regions (sidebars), lighter to draw attention to interactive elements (buttons). Never stack a light translucent surface on another. (apple-design 12)
- Bigger surfaces read thicker: stronger blur and a deeper shadow than small chips; shadow heavier over busy or text content, lighter over plain backgrounds. (apple-design 12)
- Modal task: surface plus a dimming scrim, background pushed back or down. Parallel non-blocking panel: translucency and offset with no scrim. Stacked sheets: dim and push back each parent layer progressively. (apple-design 12)
- Replace a 1px divider under a sticky header with a small blur or gradient mask fade where content meets floating chrome, and only where floating UI actually overlaps content. (apple-design 12)
- A gradient fade with a visible edge: use an eased gradient with extra colour stops along an ease curve. (cheatsheet)
- Keep `filter: blur()` below 20px; heavy blur is expensive, especially in Safari. (emil-design-eng; improve-animations AUDIT 5)
- The files contain no "borders versus shadows" rule beyond the above. Nothing else is stated; do not infer one.

### Typography
- Tracking is size-specific, never one value: large display text gets negative tracking (about `-0.02em`), small text slightly positive, body near `0`. (apple-design 15; cheatsheet "large headings: -0.02em")
- Leading tracks size inversely: tight on large headings (example `line-height: 1.05`), looser on body (example `1.5`); looser for scripts with tall ascenders, tighter for dense information-heavy UI. (apple-design 15)
- Build hierarchy from weight, size and leading together, not size alone; emphasise with weight because it adds presence without taking space. (apple-design 15)
- Spacing in `rem`/`em`, not fixed px, so layout scales with the user's text size setting. (apple-design 15)
- Default to the platform system font before a custom face; override only with a reason (`font: 100%/1.5 system-ui, sans-serif`). (apple-design 15)
- Use `font-optical-sizing: auto` and `clamp(2rem, 5vw, 4rem)` for display size in the example. (apple-design 15)
- Numbers that jitter when they change: `font-variant-numeric: tabular-nums`. (cheatsheet)
- Body text line length: `max-width: 65ch` (about 65 characters). (cheatsheet)
- Over blurred or translucent surfaces use higher-contrast, slightly heavier text with a small letter-spacing bump, not flat grey. (apple-design 12)
- Specific labels: name nav items for their contents ("Progress", "Library"), not vague umbrellas ("Home"). (apple-design 16)

### Colour
- Put colour on a solid layer, not on the translucent foreground, to keep legibility over changing backgrounds. (apple-design 12)
- Colours must adapt to light and dark; ease dark-to-light theme changes to avoid abrupt brightness jumps. (apple-design 16.7, 14)
- `prefers-contrast: more`: use near-solid backgrounds with a defined, contrasting border. (apple-design 14)
- `prefers-reduced-transparency: reduce`: raise background opacity or go solid and drop the blur (example `background: white; backdrop-filter: none`). (apple-design 14)

### Layout and spacing
- Avatar squished into an oval: `flex-shrink: 0` on the avatar. (cheatsheet)
- Proximity implies relationship: put a control near what it affects and arrange controls to mirror what they change; if a control needs a label to explain it, the mapping is weak. (apple-design 16)
- Every spacing, timing and alignment value is deliberate and defensible; misaligned icons and layouts that break on rotation read as carelessness. (apple-design 16.7)
- Hierarchy through order, spacing and contrast so the most important thing is the most obvious; show the common path first, advanced options one level deeper. (apple-design 16.6)
- Be consistent: things that look the same behave the same and live in the same place. Break a familiar pattern only if proven better by testing. (apple-design 16.4)
- Simplicity is not minimalism: burying everything in one place looks minimal but is not simple; sometimes adding context simplifies. (apple-design 16.6)
- Large moving objects: make them semi-transparent while they travel; fade big surfaces out during a large reposition and back in once settled. (apple-design 14)
- Percent translate is relative to the element's own size; prefer `translateY(100%)` to hard-coded px offsets. (emil-design-eng; AUDIT 8)

### Controls and hit areas
- Any pressable element: `transform: scale(0.97)` on `:active` (allowed range 0.95 to 0.98), `transition: transform 160ms var(--ease-out)` (in apple-design: 100ms ease-out). (emil-design-eng; cheatsheet; apple-design 1)
- Highlight on touch-down, commit on touch-up; add about 10px of hit padding or hysteresis around the target; allow cancel by dragging away and back. (apple-design 10)
- Drag or swipe: require about 10px movement before committing a direction, then track 1:1. (apple-design 10)
- Respect the grab offset when dragging; do not snap the element's centre to the pointer. Use `setPointerCapture`. (apple-design 2; emil-design-eng)
- Ignore additional touch points once a drag has begun (`if (isDragging) return`). (emil-design-eng)
- Gate hover effects behind `@media (hover: hover) and (pointer: fine)`, since touch fires false hover on tap. (emil-design-eng; review-animations 8)
- Tooltips: delay before the first appears; once one is open, adjacent tooltips open instantly with `transition-duration: 0ms`. (emil-design-eng)
- Detect all plausible gestures in parallel from the first move; avoid recognisers that only report a final state; pay a disambiguation delay (double-tap) only where double-tap truly exists. (apple-design 10)
- Audit debounces, artificial timers, transition waits and the roughly 300ms tap delay on the input path. (apple-design 1)
- Hold-to-delete pattern for destructive confirm: overlay `clip-path: inset(0 100% 0 0)` to `inset(0 0 0 0)` over 2s linear on `:active`; release snaps back in 200ms ease-out; button also gets `scale(0.97)`. (emil-design-eng)
- Cursor, focus rings, text selection: not covered by these files. Nothing is stated; do not infer.

### Forms
- Validate inline, not on submit. (apple-design 16 tactical)
- Confirmation dialog only for genuinely destructive, irreversible actions; overusing it trains people to click through. Back it with forgiveness: easy undo for slips. (apple-design 16.2)
- Ask for privacy-relevant data at the right moment, only what is needed, transparently. (apple-design 16.3)
- Be concise: plain language, no jargon, fewer steps. (apple-design 16.6)

### Feedback and toasts
- Four kinds of feedback: status, completion, warning, error. Confirm meaningful actions, expose ongoing status, warn before problems. (apple-design 16)
- Wayfinding on every screen: Where am I, where can I go, what is there, how do I get out? Never trap the user. (apple-design 16)
- Toast: enter and exit from the same direction so swipe-to-dismiss feels intuitive; `translateY(-100%)` or `100%` based placement; 400ms `ease`. (emil-design-eng; review-animations 3)
- Toast stack: gap-filling pseudo-elements keep hover state; pause timers when the tab is hidden. (emil-design-eng)
- Swipe-dismiss: dismiss if distance beyond threshold or velocity `Math.abs(distance)/elapsedMs > 0.11`. (emil-design-eng; AUDIT 4 "about 0.11")
- Multimodal feedback: fire visual, sound and haptic on the same frame; trigger on the true causal event; reserve for meaningful moments (success, error, commit, snap); over-feedback trains users to ignore it. (apple-design 13)
- Dim to focus, separate to keep flow (see surfaces). (apple-design 12)

### Loading and perceived speed
- Spinners on operations that resolve in under 300ms flash like a glitch: remove. Skeleton shimmer on content that loads in under 300ms: remove. (remove-animations)
- A faster-spinning spinner makes loading feel faster at the same load time. (emil-design-eng)
- Charts that redraw from zero on every mount or refresh, numbers counting up on page load, and table rows animating in when data loads are decoration: remove (a number ticking from old to new on a user action is allowed). (remove-animations)
- Infinite loops (pulse, shimmer, glow) on a persistent element: run once or keep only the static end state; spinning icons that are not loading indicators go. (remove-animations)
- Empty states: only mention is a rare first-time moment (onboarding, empty state, success) may keep delight. No other empty-state rule exists in these files. (remove-animations)

### Scroll and overflow
- Reveal-on-scroll images: `clip-path: inset(0 0 100% 0)` to `inset(0 0 0 0)`, `IntersectionObserver` or `useInView` with `{ once: true, margin: "-100px" }`. Marketing only; repeated scroll reveals on every section fail the gate. (emil-design-eng; remove-animations)
- Rubber-band at boundaries: `rubberband(overshoot, dimension, 0.55) = (o*d*c)/(d + c*|o|)`; allow over-drag with rising friction rather than a hard stop. (apple-design 9; emil-design-eng)
- Jittery scroll reads as carelessness. (apple-design 16.7)
- Fixed strips replaced by translucent bars with content scrolling under. (apple-design 12)
- Scroll-snap, overflow, and table overflow handling: not covered. Do not infer.

### Other
- Old timestamps read "340 days ago": switch to an absolute date after a week. (cheatsheet)
- Count reads "1 members": pluralise with `Intl.PluralRules`. (cheatsheet)
- Tabs with a seamless colour change: duplicate the tab list, style the copy as active, clip it to the active tab, animate the clip on change. (emil-design-eng)
- Comparison slider: overlay two images, clip the top with `clip-path: inset(0 50% 0 0)` and adjust the right inset from the drag. (emil-design-eng)
- Opacity plus height for list items entering or leaving: trial and error, no formula. (emil-design-eng)
- Test gestures on real devices (phone over USB by IP address, Safari remote devtools). (emil-design-eng)
- Familiar metaphors, neither too literal nor too abstract; honour their physics. (apple-design 16.4)
- Flexibility: adapt to context, device and ability; let people personalise when no single layout fits. (apple-design 16.5)
- Interactive docs with ready-to-use snippets lower the adoption barrier. (emil-design-eng Sonner 6; component libraries only)

---

## 3. Motion rules (IMPLEMENT)

### Easing
- Decision order: entering or exiting gets ease-out; moving or morphing on screen gets ease-in-out; hover or colour change gets `ease`; constant motion (marquee, progress bar) gets `linear`; default is ease-out. (emil-design-eng; STANDARDS)
- Tokens: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` (Ionic style). (emil-design-eng; STANDARDS; AUDIT 2)
- Built-in CSS easings are too weak for deliberate motion; use these custom curves, found via easing.dev or easings.co, and do not hand-roll. (emil-design-eng)
- Never `ease-in` on UI: it delays the moment the user watches most. ease-out at 200ms feels faster than ease-in at 200ms. (emil-design-eng; review-animations)
- Sonner-style toasts use `ease` (not ease-out) at 400ms, to feel more elegant. (emil-design-eng; review-animations)
- WAAPI example curve: `cubic-bezier(0.77, 0, 0.175, 1)`, 1000ms, `fill: forwards`. (emil-design-eng)

### Duration
- Button press 100 to 160ms; tooltips and small popovers 125 to 200ms; dropdowns and selects 150 to 250ms; modals and drawers 200 to 500ms; marketing and explanatory can be longer. (emil-design-eng; STANDARDS; AUDIT)
- UI animations stay under 300ms; exceptions are modals, drawers, sheets (up to 500ms) and toasts (400ms ease). A 180ms dropdown feels more responsive than 400ms. (emil-design-eng)
- Over-budget UI duration in review: reduce to 150 to 250ms (emil-design-eng checklist) or 200 to 250ms (remove-animations).
- Exit faster than enter: enter 250ms, exit 200ms. (emil-design-eng checklist)
- Slow motion test: temporarily 2x to 5x the duration. (emil-design-eng; STANDARDS)

### Physicality and origin
- Never start from `scale(0)`; start at `scale(0.9)` or higher (example `scale(0.95)`) plus `opacity: 0`. Tooltip example: `scale(0.97)`, 125ms. (emil-design-eng)
- Popovers, dropdowns and tooltips: `transform-origin` at the trigger (`var(--transform-origin)` in Base UI). Modals stay `center`. (emil-design-eng)
- Pure fade entrances with no initial transform are a finding (outside the reduced-motion variant). (review-animations)
- `scale()` also scales children; fine for press feedback. (emil-design-eng)
- 3D: `transform-style: preserve-3d` with `rotateX/Y` for orbit and flip effects. (emil-design-eng)

### Springs
- Apple-style spec (recommended in emil): `{ type: "spring", duration: 0.5, bounce: 0.2 }`. Physics spec: `{ mass: 1, stiffness: 100, damping: 10 }`. Bounce 0.1 to 0.3 when used; avoid bounce in most UI. Use for drag-to-dismiss and playful interactions. (emil-design-eng)
- Decorative mouse-tracking: `useSpring(rotation, { stiffness: 100, damping: 10 })`, rotation factor `x * 0.1`. (emil-design-eng)
- Use springs for drag with momentum, "alive" elements, interruptible gestures, and decorative mouse tracking. (emil-design-eng)
- Apple damping ratio and response: damping 1.0 is critically damped (default for most UI), about 0.8 only when the gesture carried momentum. Response in seconds, not a duration. (apple-design 4)
- Apple values: move or reposition damping 1.0 response 0.4; rotation 0.8 and 0.4; drawer or sheet 0.8 and 0.3. Default UI spring damping 1.0 response 0.3 to 0.4; momentum spring about 0.8 at 0.3 to 0.4. (apple-design 4, Quick Reference)
- Web mapping (Motion): `{ type: 'spring', bounce: 0, duration: 0.4 }` by default; `bounce: 0.2, duration: 0.4` only after a flick. (apple-design 4)
- Velocity handoff: pass the release velocity as the spring's initial velocity; relative velocity is `gestureVelocity / (target - current)` (example 50 / 100 = 0.5); Motion takes absolute px/s. (apple-design 5)
- Momentum projection: `project(v, d=0.998) = (v/1000)*d/(1-d)`; `d = 0.99` for snappier; snap to the target nearest `current + project(v)`; not `v^2/(2*decel)`. (apple-design 6)
- Decompose 2D motion into independent X and Y springs. (apple-design 3)
- Blend velocity on reversal; animate from the live (presentation) value, not the target value. (apple-design 3)

### Interruptibility
- Use CSS transitions (not keyframes) for anything triggered rapidly; keyframes restart from zero. Toast example: `transition: transform 400ms ease`. (emil-design-eng)
- `@starting-style { opacity: 0; transform: translateY(100%) }` with `transition: opacity 400ms ease, transform 400ms ease` for entry; legacy fallback `useEffect(() => setMounted(true), [])` with `data-mounted`. (emil-design-eng)
- Gesture-driven motion: springs, not transitions or keyframes. (apple-design 3)
- Asymmetric: press 2s linear, release 200ms ease-out. (emil-design-eng)

### Blur masking and tabs
- Crossfade that looks like two overlapping objects: add `filter: blur(2px)` plus `opacity: 0.7` during the transition at `200ms ease`, combined with `scale(0.97)` on press. (emil-design-eng)
- Materialise glass surfaces: animate blur radius and scale together on enter and exit. (apple-design 12)

### Stagger
- 30 to 80ms between items; example delays 0, 50, 90, 120ms (non-uniform); each item `opacity: 0; translateY(8px)` to visible over 300ms with the ease-out token. Never block interaction while it plays. One entrance per container (choreograph skill, not supplied). (emil-design-eng; review-animations)

### Gestures
- Dismiss by flick: velocity above about 0.11 (`Math.abs(swipeAmount)/timeTaken`) dismisses regardless of distance. (emil-design-eng)
- Damping at boundaries and friction instead of hard stops. (emil-design-eng; apple-design 9)
- Hint in the direction of the gesture: in-between frames should point at the outcome. (apple-design 8)
- Very fast motion: subtle motion blur or stretch. (apple-design 11)

### Performance
- Animate `transform` and `opacity` only; `clip-path` and measured-height accordions are the documented exceptions. `width`, `height`, `margin`, `padding`, `top`, `left` trigger layout, paint and composite. (emil-design-eng; AUDIT 5)
- Never `transition: all`; list exact properties. (emil-design-eng)
- Do not drive a child transform through a CSS variable set on the parent; set `transform` directly on the element. (emil-design-eng)
- Motion shorthands (`x`, `y`, `scale`, `rotate`) are accelerated from motion 14.2; before that, use `animate={{ transform: "translateX(100px)" }}`. `layout`, `layoutId`, `onUpdate`, `transformTemplate`, inertia and per-frame motion values run on the main thread in every version. (emil-design-eng)
- CSS or WAAPI for predetermined motion; JS and springs for dynamic or gesture-driven. CSS animations beat rAF under load (Vercel dashboard tab example). (emil-design-eng)
- Add `will-change` only after measuring a shift or dropped frames (animation-performance skill, not supplied). (apple-design 11)

### Accessibility (motion side)
- `prefers-reduced-motion: reduce`: gentler, not zero; keep opacity and colour fades (example `animation: fade 0.2s ease`), drop movement and position; sheet example `transition: opacity 200ms ease; transform: none`. (emil-design-eng; apple-design 14)
- Avoid full-viewport moving backgrounds and slow looping oscillation near 0.2 Hz (one cycle per 5s). (apple-design 14)

---

## 4. Review standards (REVIEW)

Checkable statements; a "Block" item means the review verdict is Block.

1. Every animation has a stated purpose. Failing on a frequently seen element: block. (review-animations 1)
2. Keyboard-initiated and 100+/day actions have no animation. Block. (review-animations 2, emil-design-eng checklist)
3. Tens-per-day motion is removed or reduced. (review-animations 2)
4. Entering or exiting elements use ease-out or a strong custom curve. `ease-in` on UI: block. (review-animations 3)
5. UI animation is 300ms or shorter, except modals, drawers, sheets, toasts. Over budget with no reason is a finding. (review-animations 4)
6. Popover, dropdown and tooltip `transform-origin` is the trigger; modals are exempt. Centre on a trigger-anchored element is a finding. (review-animations 5)
7. No `scale(0)`. Block. Start 0.9 to 0.97 plus opacity. (review-animations 5)
8. Rapid or gesture-driven motion uses transitions or springs, not keyframes. (review-animations 6)
9. Only `transform` and `opacity` (plus `clip-path`, measured height). A non-GPU animation with an easy GPU fix: block. (review-animations 7)
10. `prefers-reduced-motion` handled (gentler, not zero); hover motion gated by `(hover: hover) and (pointer: fine)`. (review-animations 8)
11. Press-and-release or hold interactions are asymmetric. Symmetric timing is a finding. (review-animations 9)
12. Motion matches the product personality; jarring crossfade should use 2px blur. (review-animations 10)
13. No `transition: all`. (review-animations escalation)
14. No parent CSS variable driving child transform. (review-animations escalation)
15. No Motion `x`/`y`/`scale` props before 14.2, and no layout animations, on motion that runs while the page is busy. (review-animations escalation)
16. Group entrances have 30 to 80ms non-uniform stagger rather than all-at-once. (review-animations escalation)
17. Every pressable element has press feedback (`scale(0.97)` on `:active`). (AUDIT 3)
18. Content swaps and layout jumps that teleport are noted as missed opportunities, at most 4, grounded in observed UX seams. (AUDIT 8)
19. Tooltips after the first in a toolbar are instant. (AUDIT 2)
20. Transition-time `filter: blur()` stays under 20px. (emil-design-eng; AUDIT 5)
21. Use slow-motion (2x to 5x), frame-by-frame and real-device checks when feel is uncertain; say so when feel cannot be judged from code. (STANDARDS; improve-animations)
22. Non-motion checkable items from the cheatsheet: tabular numerals on changing numbers; `-0.02em` on large headings; body line length about 65ch; avatars `flex-shrink: 0`; absolute dates after a week; correct plurals; eased gradient fades. (cheatsheet)

Blocking defects (verbatim criteria): any feel-breaking regression (sluggish easing, comes-from-nowhere, motion on high-frequency or keyboard actions), animation on a keyboard or high-frequency action, `scale(0)` or `ease-in` on UI, or a non-GPU animation with an easy GPU fix. Approve only when none exist, nothing obvious should be deleted, durations and easing are in bounds, interruptibility is handled, and reduced motion is respected. Default posture: flag; approval is earned. (review-animations)

Severity scale from the audit skill: HIGH feel-breaking (wrong easing on UI, animation on keyboard or high-frequency, dropped frames, `scale(0)`); MEDIUM noticeably off (wrong origin, non-interruptible dynamic UI, missing reduced-motion); LOW polish (stagger, blur-masked crossfades, token consolidation). (improve-animations)

Output format prescribed for a review, in two lines: Part 1, one markdown table with columns Before, After, Why, one row per issue, never a "Before:/After:" list, citing `file:line`. Part 2, a verdict grouped by impact tier (feel-breaking regressions, missed simplifications, performance, interruptibility and timing, origin physicality and cohesion, accessibility), ending with Block or Approve. (review-animations; emil-design-eng)

Other formats, for reference: audit table columns `# | Severity | Category | Location | Finding | Fix summary` ordered by leverage, plus up to 4 missed opportunities (improve-animations); removal report `# | Location | Was | Verdict | Deciding branch` plus a mandatory "Kept" list of up to 5 (remove-animations).

---

## 5. When to remove motion

Gate, in order (first match decides): (remove-animations)
1. Keyboard-triggered (shortcut, command palette, focus jump, arrow-key navigation): delete.
2. Seen 100+ times a day (core navigation, tab switches, list rows, in-app route changes): delete.
3. On functional data (charts, tables, numbers, dashboards): delete unless it shows a real value change on user action.
4. No nameable purpose: keep only if it is a rare first-time moment (onboarding, empty state, success); otherwise delete.
5. Purposeful and seen tens of times a day (hover, frequent toggles, list expansion): reduce.
6. Over budget (above 300ms outside modal, drawer, sheet, toast, or a slide or scale where a fade carries the meaning): reduce.
7. Otherwise keep.

Reductions: hover scale, lift or shadow growth becomes colour or opacity only, at most 150ms, existing curve. Slide or scale entrance on a frequent surface becomes opacity only at 150ms. UI above 300ms becomes 200 to 250ms. Stagger above 80ms per item or 300ms total: cap at 30ms per item or fade the group as one. Infinite loop: run once or keep the static end state. If reduction leaves motion too small to carry its purpose, delete it. Marketing pages get latitude for explanation and a single hero entrance, but repeated per-section scroll reveals still fail. (remove-animations)

Hazards before deleting: (remove-animations)
- Hidden start states (`animation-fill-mode: forwards` from `opacity: 0`, Motion `initial={{ opacity: 0 }}`, a reveal class at `opacity: 0` until an observer fires): remove the start state too, or the element stays invisible.
- Code waiting on the animation (`onAnimationEnd`, `transitionend`, `onExitComplete`, `setTimeout` sized to a duration): delete the wait.
- Exit animations delaying unmount (`AnimatePresence`): move `onExitComplete` logic to where the component closes.
- Layout animations hiding a jump (Motion `layout`, FLIP): if the jump appears, keep the animation and list the shift.
- Focus moved in an animation callback must move immediately.
- Tests and selectors waiting for animation classes or durations.
- Cleanup: orphaned `@keyframes`, `motion.div` to `div`, empty `AnimatePresence`, unused variants, unused Motion imports, unused Tailwind animation entries; propose, do not perform, dropping the dependency.
- Remove only subtracts; it never adds motion or retunes easing.

Hunt list: command palette or dialog opened by shortcut; sliding tab switches, segmented controls and sidebar nav; in-app route transitions; hover transforms on rows; fade-in-on-scroll on every section (`whileInView`, AOS, `animate-fade-in`); hover scale on non-primary cards; pulsing badges, gradient orbs, glowing borders; staggered list entrances loaded many times a day; charts redrawing from zero; count-up numbers on load; table rows animating on load; spinners and skeleton shimmer under 300ms; `transition: all`. (remove-animations)

---

## 6. Apple-style principles translated for the web

- Respond on pointer-down; update 1:1 with the pointer through the whole gesture; `.button:active { transform: scale(0.97); transition: transform 100ms ease-out }`. (apple-design 1)
- Direct manipulation: Pointer Events, `setPointerCapture`, keep a short position and timestamp history for velocity, respect the grab offset. (apple-design 2)
- Interruptible always; animate from the live value; avoid CSS transitions and keyframes for gesture-driven motion; blend velocity on reversal; separate X and Y springs. (apple-design 3)
- Behaviour over animation: springs with damping ratio (1.0 default, about 0.8 with momentum) and response (0.3 to 0.4 s). Values: move 1.0 and 0.4; rotation 0.8 and 0.4; drawer 0.8 and 0.3. Web default: `bounce: 0`, `duration: 0.4`; flick: `bounce: 0.2`. (apple-design 4)
- Velocity handoff and momentum projection (`d = 0.998`, `0.99` for snappier): see section 3. (apple-design 5, 6)
- Spatial consistency, anchored origins, hint in the direction of the gesture. (apple-design 7, 8)
- Rubber-banding with constant 0.55. (apple-design 9)
- Gesture details: highlight on down, commit on up, about 10px hit padding and about 10px hysteresis. (apple-design 10)
- Frame-level smoothness: motion blur for fast motion; `rAF`; animate only `transform` and `opacity`. (apple-design 11)
- Materials and depth, vibrancy, scroll edge effects, materialise: see section 2. (apple-design 12)
- Multimodal feedback: causality, harmony (same frame), utility. (apple-design 13)
- Reduced motion, reduced transparency, increased contrast: three independent signals; cross-fade instead of slide or spring; drop elastic and overshoot. (apple-design 14)
- Typography: size-specific tracking (display `-0.02em`), leading inverse to size, weight plus size plus leading, `rem`/`em`, system font first. (apple-design 15)
- Eight principles: Purpose, Agency (undo, rare confirmations), Responsibility (privacy, safety), Familiarity (consistency, proven-better breaks), Flexibility (platform, abilities, personalise), Simplicity not minimalism (common path first), Craft (every value deliberate), Delight (result, not decoration). Tactical: four kinds of feedback, wayfinding questions, proximity and mapping, direct specific labels. (apple-design 16)
- Process: interactive prototype, interaction and visuals together, real people, fresh eyes. (apple-design 17)

---

## 7. Conflicts and hard limits

### Contradictions across files
1. Hover scale: emil-design-eng and review-animations show `.element:hover { transform: scale(1.05) }` (gated by media query) as the model; remove-animations reduces any hover scale, lift or shadow growth to colour or opacity only (at most 150ms), and the frequency table says remove or drastically reduce hover at tens/day. Both are in the same author's skills.
2. Over-budget duration target: emil-design-eng checklist says reduce to 150 to 250ms; remove-animations says 200 to 250ms.
3. Press feedback timing: emil-design-eng and cheatsheet use 160ms with `var(--ease-out)`; apple-design uses 100ms `ease-out`. Both sit in the 100 to 160ms band.
4. Bounce: emil-design-eng recommends `duration: 0.5, bounce: 0.2` as the spec and allows 0.1 to 0.3; apple-design defaults to `bounce: 0` and damping 1.0, allowing about 0.8 only when the gesture carried momentum. Apple's drawer value (0.8, 0.3) is a bouncy default that emil says to avoid in most UI.
5. Spring settle versus the 300ms budget: apple-design response 0.3 to 0.4 s with duration 0.4 exceeds emil-design-eng "UI animations stay under 300ms" (the modal, drawer, sheet and toast exemptions cover only some cases).
6. Interruptibility tool: emil-design-eng prescribes CSS transitions for rapid UI and keyframes avoided; apple-design says avoid CSS transitions and keyframes for anything gesture-driven and use springs. Reconcile by gesture-tracked versus discrete toggles.
7. Easing: emil-design-eng says never `ease-in`, default ease-out, hover and colour use `ease`, and the toast uses `ease`, while also saying bare `ease` on entrances is weak (AUDIT 2 hunts "bare `ease`/`linear` on entrances", Sonner toasts excepted).
8. Stagger: emil-design-eng allows 30 to 80ms per item with a 300ms keyframe; remove-animations caps at 30ms per item or 300ms total and deletes stagger on frequently loaded lists. Stagger examples in emil use keyframes, against its own "transitions not keyframes for dynamic UI".
9. Entrance: emil says pure fade entrances with no initial transform are an escalation in review-animations, while remove-animations says to reduce a slide or scale to opacity only on frequent surfaces.
10. Transparency versus legibility: apple-design wants translucent chrome and blur; emil-design-eng limits blur below 20px for cost; apple uses `blur(20px)`, which is at the limit, not under it.
11. System font default (apple-design 15) conflicts with any pipeline rule to pick a distinctive typeface; the file says override only with a reason.
12. Scroll edge fade instead of a 1px divider (apple-design 12) versus ordinary hairline dividers; applies only where floating UI overlaps content.

### Absolutes ("never", "always", "ever")
- "No animation. Ever." for 100+ per day actions. Never animate keyboard-initiated actions. (emil-design-eng)
- Never use `ease-in` for UI animations. (emil-design-eng)
- Never animate from `scale(0)`. (emil-design-eng)
- Never lock out input during a transition. (apple-design 3)
- Never stack a light translucent surface on another. (apple-design 12)
- Never one tracking value for all sizes. (apple-design 15)
- Never block interaction while stagger plays. (emil-design-eng)
- Always animate from the presentation value, never the target. (apple-design 3)
- Never use `transition: all`. (emil-design-eng)
- Never present an unconfirmed finding; never modify source in the improve skill; never add or retune motion in the remove skill. (process rules of the skills; not applicable to the pipeline itself)
- "Default to flagging; approval is earned." (review-animations)
- Never trap the user. (apple-design 16)
- Never put hand-rolled easing curves in place of a found one ("don't create curves from scratch"). (emil-design-eng)

### Library or framework assumptions
- Motion / Framer Motion: `useSpring`, `useTransform`, `useReducedMotion`, `useInView`, `layout`, `layoutId`, `AnimatePresence`, `motion.div`; the 14.2 version cutoff. (emil-design-eng; improve-animations; remove-animations)
- Base UI: `var(--transform-origin)`, `data-starting-style`, `data-ending-style`, `data-instant`. (emil-design-eng)
- Radix, shadcn/ui, Sonner, Vaul, Ionic (drawer curve), Embla, AOS, Tailwind (`animate-fade-in`). (emil-design-eng; improve-animations; remove-animations)
- React (`useEffect` mount pattern). (emil-design-eng)
- Browser APIs: `@starting-style`, `backdrop-filter`, WAAPI, Pointer Events, `IntersectionObserver`, `Intl.PluralRules`, `prefers-reduced-transparency`, `prefers-contrast`. (various)
- Cross-references to files not supplied: `../choreograph/SKILL.md`, `../animation-performance/SKILL.md`, `find-animation-opportunities`. Rules depending on them are only summarised above.
- The apple-design file is from WWDC talks and uses iOS terms (Dynamic Type, CADisplayLink, haptics) that need web translation.

---

## 8. Not relevant to web app screens

- The "Initial Response" fixed replies in every skill (emil-design-eng, review-animations, improve-animations, remove-animations, apple-design): instructions about how an agent speaks when invoked, not craft rules.
- Plan template and plan directory workflow, `execute`, `reconcile`, `plan` variants, effort levels, subagent fan-out (improve-animations, PLAN-TEMPLATE): agent process, not UI rules.
- Hard rules about not editing source or about worktrees (improve-animations, remove-animations): agent behaviour.
- Marketing-page and landing animation: image reveals, hero entrances, comparison sliders, orbit and coin-flip 3D effects, hold-to-delete confetti (emil-design-eng): rare or marketing, not app screens.
- Haptics, sound, Vibration API (apple-design 13): rarely applicable to desktop web app screens.
- Dynamic Island, PiP, Control Center, iOS rotation values (apple-design 4): iOS specific; kept only as numeric references.
- Sonner principles on naming, docs site and developer experience (emil-design-eng): library author advice.
- Debugging on Xcode Simulator and Safari remote devtools (emil-design-eng): tooling.
- Motion library hardware-acceleration version details beyond the rules above: relevant only if the project uses Motion.
- Easing resource links (easing.dev, easings.co): reference only.
