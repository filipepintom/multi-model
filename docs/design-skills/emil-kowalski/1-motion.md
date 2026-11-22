# Motion rules extracted for web app screens

Sources (abbreviations used below): (animate) = animate/SKILL.md; (animate-recipes) = animate/RECIPES.md; (choreograph) = choreograph/SKILL.md; (choreograph-recipes) = choreograph/RECIPES.md; (find) = find-animation-opportunities; (vocab) = animation-vocabulary; (perf) = animation-performance; (cheatsheet) = performance-cheatsheet.md. All eight files were read in full. Instructions inside them addressed to an agent (initial replies, output formats, tone) were not extracted as rules.

Note: the files contain NO explicit rules for loading states, optimistic UI, or highlighting a changed value (only vocabulary terms for skeleton/shimmer, text morph, pulse, shake, number ticker). Those are flagged where they would appear; nothing was invented.

## 1. Deciding where motion goes (DESIGN)

Frequency gate (run first, per surface):
- Used 100+ times a day (keyboard shortcuts, command palette, core navigation): no animation, ever. Stop. (animate, find)
- Used tens of times a day (hover, list navigation, frequent toggles): near-imperceptible motion only (fast and subtle) or nothing. (animate, find)
- Occasional (modals, drawers, toasts, settings): standard animation. (animate, find)
- Rare or first-time (onboarding, empty state, success, celebration): the only tier where delight, bounce and a longer beat are allowed. (animate, find)
- Anything started from the keyboard is disqualified, not a judgment call. Example given: Raycast has no open/close animation. (animate, find)
- Imagine the 50th use of the day; if you would skip it, cut it. (choreograph)
- Daily use argues for less motion, not more; a crisp dashboard gets fewer and subtler motions than a playful consumer app. (find)

Purpose gate (name one word or do not build it):
- Feedback (the interface heard the user), spatial consistency (where it came from or went), state indication (a state change made legible), preventing a jarring change (content that teleports), explanation (marketing/onboarding only), delight (rare tier only). (animate, find)
- "It looks cool" is not a purpose; on a frequently seen element it is a reason to stop. (animate, find)
- Function test: data the user is reading or acting on must not move for style; decoration on information-dense UI hinders. Example: no mouse-tracking effect or animated line draw on a banking-app graph. (animate, find)
- Speed test: if the moment only works as a slow, showy animation, it fails. (find)

How many moments, and what to reject:
- Expect to reject most candidates; for a whole app propose at most 5 to 7 moments, fewer per view, ordered by leverage. (find)
- A result of "nothing needs to animate" is a valid outcome. When the request fails the gate, say so and offer the non-motion alternative (instant state change, static affordance). (animate, find)
- Reject: command palette open/close; animated line drawing on an analytics graph; scroll reveal on functional UI visited daily; staggering a list the user scrolls past all day. (find, animate-recipes)
- Hunt list of acceptable seams: pressable elements with no :active state; destructive actions confirmed by plain click; content that swaps/appears/vanishes instantly; accordions that snap; list add/remove (if not high-frequency); panels with no tie to their trigger; occasional grids that pop in at once; drag elements with no physics; flat rare moments. (find)
- Do not animate a list/grid entrance on a surface seen constantly. (choreograph, animate-recipes)

Roles in a sequence (assign before writing any timing):
- Lead (the one thing to notice: moves first, travels most, stays longest); Support (follows, shorter and smaller motion); Decoration (pills, badges, accents, dividers: fade only, no movement, or nothing); Static (everything else, including containers whose content animates: does not animate). (choreograph)
- If two elements both want to be Lead, it is a hierarchy problem motion cannot fix; say so. (choreograph)
- Most groups shrink at this step: a panel with eight menu items becomes one move, the panel slides and the items are just there. (choreograph)
- Pair relationship decision: same object or same moment -> together; order has no meaning -> together; order meaningful and showing both would look broken -> sequence; otherwise overlap (stagger). A fifth option, carry: animate the parent and let children come along. (choreograph)
- Order follows importance, not DOM order; group a title and its first paragraph as one beat. Direction follows reading direction (top to bottom) or the cause (outward from the point of interaction). (choreograph)
- Sequence only when overlap looks wrong: two dense views in a container that changes size in both dimensions; one element would visibly pass through another; drawing with cause and effect (checkbox square then checkmark). (choreograph)
- Timeline table to produce before coding: element, role, start, duration, motion, relationship; plus a list of up to 5 things deliberately not animated and why. (choreograph)

Direction and meaning:
- Forward navigation moves content left (new enters from the right); Back moves it right. Same-direction slide for Next and Back is a defect. (choreograph)
- Content switching between sibling menus enters from the side of the trigger the user came from. (choreograph)

## 2. Tokens to record in DESIGN.md

Easing curves (use these; do not invent or approximate):
- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` strong ease-out; default for UI, entering/exiting, anything responding to the user. (animate)
- `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` strong ease-in-out; for elements already on screen moving or morphing. (animate)
- `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` iOS-like drawer curve. (animate)
- Built-in `ease` for hover/colour change; `linear` only for constant motion (marquee, progress/hold fill). (animate)
- Built-in CSS easings are "too weak"; need another curve: take it from easing.dev or easings.co, do not hand-roll. (animate)
- Decision table: enter/exit = ease-out; move/morph on screen = ease-in-out; hover/colour = ease; constant = linear; default = ease-out. (animate)
- Components inside one container stay in one easing family (a lighter curve is fine for content, but not an ease-in-out body inside an ease-out container); set once via one shared CSS custom property or MotionConfig. (choreograph)

Duration scale:
- Button press feedback 100-160ms (recipe uses 160ms). (animate, animate-recipes)
- Tooltips and small popovers 125-200ms (tooltip recipe 125ms). (animate, animate-recipes)
- Dropdowns, selects 150-250ms (recipe 200ms). (animate, animate-recipes)
- Modals, drawers 200-500ms (modal recipe 250ms; drawer recipe 500ms). (animate, animate-recipes)
- Toast 400ms with built-in `ease`. (animate-recipes)
- Accordion 200ms height + opacity. (animate-recipes)
- Tab indicator clip 250ms with ease-in-out. (animate-recipes)
- Marketing/explanatory can be longer (scroll reveal 600ms). (animate, animate-recipes)
- UI animations stay under 300ms; modals, drawers, sheets and toasts are the documented exceptions. A 180ms dropdown feels more responsive than a 400ms one. (animate, find)
- Hold-to-confirm: press fill 2s linear, release 200ms ease-out. (animate, animate-recipes)

Stagger and group budgets:
- Product UI stagger 30-80ms between items, group total under about 300ms; stagger only the first handful of a long list (items beyond the 5th share the 5th's delay). (choreograph, choreograph-recipes, animate)
- Marketing/first-run: 100-150ms steps on 0.5-0.6s entrances. (choreograph)
- Example non-uniform delays for product UI: 0, 50, 90, 120ms on 300ms fades with 8px rise. (animate-recipes)

Spring settings:
- `{ type: "spring", duration: 0.5, bounce: 0.2 }` Apple-style, easier to reason about. (animate, animate-recipes)
- `{ type: "spring", mass: 1, stiffness: 100, damping: 10 }` traditional physics. (animate)
- Bounce 0.1-0.3; avoid bounce in most UI; reserve for drag-to-dismiss and playful interactions. (animate)
- `{ type: "spring", duration: 0.5, bounce: 0 }` for step/view transitions. (choreograph-recipes)
- Smaller elements need more bounce; tune bounce per state; with a small finite set of states hardcode values per transition rather than a formula. (choreograph)

Other values to write once:
- Press scale `0.97` (subtle range 0.95-0.98). (animate-recipes, find)
- Entrance start scale 0.9-0.97 (animate) with recipes: popover 0.95, tooltip 0.97, modal 0.96, exit scale 0.95 for removed chips; always with opacity 0. (animate, animate-recipes, choreograph-recipes)
- Entrance rise: lead 12px, support 6-8px, decoration none. (choreograph-recipes, animate-recipes)
- Swipe velocity threshold 0.11 (px per ms). (animate-recipes, find)
- Blur ceiling: animated blur under 20px; 2-5px is enough to soften a crossfade (blur 2px + opacity 0.7 for the masking recipe). (perf, animate-recipes)
- Fade duration for container-resize crossfade: `clamp(0.15s, deltaHeight/500, 0.27s)`; container height 0.27s with `cubic-bezier(0.25, 1, 0.5, 1)`. (choreograph, choreograph-recipes)
- Direction slide distance 110% with opacity; small container/similar views: crossfade with 8px shift and light blur. (choreograph-recipes)
- Attention loop: first run after about 2.5s, repeat every about 6s, stop during interaction. (choreograph)
- Frame budget: 16.7ms at 60Hz, 8ms at 120Hz; design for 8ms. (perf)
- Reduced motion policy: fewer and gentler, not zero. (animate)

## 3. Building it (IMPLEMENT)

Properties:
- Animate `transform` and `opacity` only. Layout properties (width, height, margin, padding, top, left, border-width) trigger layout+paint+composite; box-shadow, border-radius, color trigger paint+composite. (animate, perf, cheatsheet)
- Sanctioned exceptions: `clip-path` (reveals, hold-to-confirm, tab indicator) and measured `height` for accordions where there is no transform equivalent. (animate)
- Swap down a tier: grow/shrink -> `scale()`; move -> `translate()`; display/visibility swap -> opacity then `visibility: hidden` after it ends; box-shadow -> `filter: drop-shadow()` (composited in Chrome; measure elsewhere). (perf)
- Use percentages in `translate()` (relative to own size) instead of hardcoded pixels; correctness beats best-effort GPU acceleration even though Chrome historically did not accelerate percentage transforms. (animate, perf)
- Never `scale(0)`; start from scale 0.9-0.97 plus opacity 0. (animate)
- Never `transition: all`; list exact properties. (animate, perf, cheatsheet)
- Never drive a child's transform from a CSS variable set on a parent (restyles every descendant; drag lag grows after about 20 items); set `transform` on the element itself. (animate, perf, animate-recipes)
- Write per-frame animation to `ref.current.style.transform` (or a motion value), never React state. Look for setState inside rAF, pointermove, scroll, drag handlers. (perf, cheatsheet)
- Long list that scrolls slowly: virtualize. (cheatsheet)

Enter and exit:
- Enter from the trigger: transform-origin at the trigger for popovers, dropdowns, menus, tooltips (`var(--transform-origin)` in Base UI); modals stay centered. (animate, animate-recipes)
- Exit the way it entered (toast slides in from bottom, leaves through bottom; slid in from right, leaves toward right, not just fade). (animate, choreograph)
- Exits are simultaneous, shorter and simpler; no reverse stagger. (choreograph)
- An element being removed must leave layout immediately (absolute at current position, or `AnimatePresence mode="popLayout"`) so siblings close the gap while it fades. (choreograph, choreograph-recipes)
- View swap in one container = crossfade, old exits while new enters (`popLayout`, not default `sync`); every child needs a stable unique `key` or the exit will not play. (choreograph, choreograph-recipes)
- Pass direction via `custom` on both AnimatePresence and the child so exits read the latest direction. (choreograph, choreograph-recipes)
- Backdrop opacity animates with the modal at the same duration (250ms). (animate-recipes)
- Container height and content swap share one duration/easing family; a drawer opening 500ms then resizing 200ms reads as two objects. (choreograph)
- Scale the fade duration by distance changed, clamped; a tiny jump with a long fade looks like a flicker. (choreograph)
- Entry without JS: CSS `@starting-style`; if unavailable, a mounted flag set in useEffect and a `data-mounted` attribute. (animate, animate-recipes)
- Without a library, hide a drawer with `translateY(100%)` and animate to 0. (animate-recipes)

Stagger:
- One entrance per container: never animate a parent's entrance and stagger its children. (choreograph)
- No stagger on high-frequency or keyboard-triggered UI (dropdown items, menu rows, palettes, tab content, list rows); they appear together or not at all. (choreograph)
- Uniform stagger is forbidden; vary delay by importance, shrink gaps as the group goes on, vary distance/duration per role. (choreograph)
- Stagger is decorative and must never block interaction; everything visible is clickable now. (choreograph, animate-recipes)
- CSS: per-item `--delay` custom property with `animation-fill-mode: both` (so delayed items do not flash their end state); omit `to` keyframe to animate to own styles. (choreograph-recipes)
- Motion: `delayChildren: stagger(0.06, { ease: "easeOut" })` on the parent; `from: "center"` or an index radiates from the interacted item; older versions use `staggerChildren`. (choreograph-recipes)
- Use `useAnimate` only when several elements coordinate across several events and you must await completion; not for a simple stagger. (choreograph)

Interruptibility:
- Use transitions, not keyframes, for anything a user can trigger twice in a second (toasts, toggles); transitions retarget from the current value, keyframes restart. (animate)
- Springs for gestures, since they carry velocity through an interruption. (animate)
- Sequences: stop in-flight animations before starting new ones; wait for all reset animations (`Promise.all`) before resuming an idle loop; check rapid view switching for two mounted children. (choreograph, choreograph-recipes)
- Asymmetric timing where the user is deciding: slow on the deliberate phase, snappy on the system response. (animate)

Press, hover, focus feedback:
- Pressable elements get `:active { transform: scale(0.97) }` with `transition: transform 160ms var(--ease-out)`; scale carries children (label, icon). No hover gating needed for `:active`. (animate-recipes, find)
- Gate hover motion with `@media (hover: hover) and (pointer: fine)` because touch fires false hovers. (animate)
- Tooltip: once one is open, neighbours open instantly (`transition-duration: 0ms`, Base UI `data-instant`); keep the initial delay to prevent accidental activation. (animate-recipes)
- Hold-to-confirm for destructive actions: `clip-path: inset(0 100% 0 0)` overlay filling to `inset(0)` over 2s linear on press, 200ms ease-out snap-back on release, plus press scale 0.97. (animate-recipes, find)
- Error/rejected input: shake or wiggle (term only). (vocab) No focus-ring motion rule exists in the files.

State-change emphasis, highlights, loading, optimistic:
- The files give no numeric rules for these. Terms that exist: pulse (gentle repeating scale/opacity), text morph, number ticker, tabular numbers (fixed-width digits so numbers do not shift as they change; "essential" for tickers, timers, counters), skeleton/shimmer. (vocab)
- Related rules that do apply: accordions/collapses and conditional content bridge with height+opacity or scale 0.95-0.97+opacity ease-out; list add/remove uses CSS transitions; keep unstable crossfades under control with the blur mask recipe. (find, animate-recipes)
- Tab/segmented control active colour: clip a duplicated, differently styled copy instead of tweening individual colours. (animate-recipes)
- Idle/attention animation is allowed only as a loop that waits about 2.5s, repeats about every 6s, and stops while the user interacts. (choreograph)

Reduced motion:
- Ships with the animation. Replace transform movement with an opacity-only variant at the same timing (`animation-name: fade`); keep transitions that aid comprehension, remove movement and position changes. In JS use `useReducedMotion` (closed position 0 instead of `-100%`). (animate)
- For choreography: drop delays and movement, keep opacity, show the group together; if the sequence is the explanation, jump between frames. (choreograph, choreograph-recipes)

Which tool (walk down, stop at first fit):
- Hover/press/colour/class-toggle: CSS transition. Mount entry without JS: `@starting-style`. Predetermined motion that must stay smooth while the page loads: CSS animation. JS control with CSS performance: WAAPI `element.animate()` (hardware accelerated, interruptible, no bundle cost). Springs, layout animations, exit animations of unmounted components, gesture-driven values: Motion. (animate)
- Do not install a motion library for a fade. (animate)
- If the task needs a component (toast, drawer, command menu, dropdown) pick a library rather than hand-rolling; hand-rolled dropdowns lack focus management. (animate)
- Working split: CSS for simple motion and anything that plays while the page is busy; Motion for complex, interruptible, gesture-driven motion. JS animation is not forbidden; main-thread animation only suffers when the page is busy during it. (perf)
- Use the codebase's existing tokens; a parallel token system is a defect. (animate)

Performance (building):
- Do not animate through inherited CSS variables or animate a CSS variable at all. (perf)
- Motion `x`/`y`/`scale`/`rotate` are accelerated only from motion 14.2+; on older versions animate a full `transform` string (`transform: "translateX(100px)"`). Layout animations (`layout`, `layoutId`), `onUpdate`, `transformTemplate`, inertia, and values driven every frame (drag, `useTransform`) stay on the main thread in every version. (perf, animate)
- Add `will-change: transform` only after you see a 1px shift at animation start/end or measured dropped frames; only on the animating element, never `*` or large containers; keep the promoted layer small. (perf, cheatsheet)
- Accordion height animation costs layout every frame: keep it short and animate to a measured pixel height, never `auto`. (animate-recipes)
- Gesture detail: pointer capture once a drag starts; guard multi-touch (`if (isDragging) return`); damp past boundaries with rising friction rather than a wall; set transform directly on the dragged element; settle with a spring. (animate-recipes)
- Drag to reorder / swipe to dismiss: dismiss on distance threshold or velocity > 0.11. (animate-recipes)

## 4. Checking it (REVIEW)

Blocking defects ("Never ship"; each is an automatic block in the source's review):
- `transition: all`. `scale(0)` entrance. `ease-in` on a UI element. Built-in `ease-out` on a deliberate animation (use the strong curve). Animation on a keyboard shortcut or 100+/day action. UI duration over 300ms without reason (modals, drawers, sheets, toasts excepted). `transform-origin: center` on a trigger-anchored popover (modals exempt). Keyframes on toasts/toggles/rapidly triggered elements. Animating width/height/margin/padding/top/left. Motion `x`/`y`/`scale` under load on versions before 14.2. Ungated `:hover` motion. Missing `prefers-reduced-motion` handling. Everything entering at once (should be a 30-80ms stagger where staggering is allowed). (animate)
- Parent entrance plus staggered children; uniform stagger; stagger on high-frequency UI; choreography that blocks interaction; sequences that break when re-triggered mid-flight. (choreograph)

Checks to run on the running app:
- Each interruption case: hover out halfway, click Next twice quickly, switch menus while the first is opening, rapid view switching (look for two children mounted, missing `key`). (choreograph)
- A wave and a queue look the same in the head and different on a recording: record and step frame by frame. (choreograph)
- Feel checks that cannot be judged from code: crossfade reading as one object, spring bounce, opacity/height balance in an entering list. Play at 2-5x duration or in the DevTools animation inspector, step frames, test gestures on a real device, look again the next day. (animate, choreograph)
- Report whether each performance finding was verified from code or needs a device recording; never conclude "it is fine" from a fast machine. (perf)

Performance symptom table:
- Stutters -> animate transform/opacity, not width/height/top/margin. (perf, cheatsheet)
- Choppy shadow animation -> `filter: drop-shadow()`. (perf)
- Jank only during navigation or loading -> move to CSS or WAAPI (example: a shared-layout tab indicator dropped frames while the next page loaded; a CSS animation fixed it). (perf)
- Motion x/y drops frames -> motion 14.2+ or transform string. (perf, cheatsheet)
- Hand-rolled animation drops frames in React -> write to ref style, not state. (perf, cheatsheet)
- Drag gets laggier as list grows -> stop animating an inherited CSS variable. (perf)
- Blur transition lags, especially Safari -> keep animated blur under 20px. (perf, cheatsheet)
- Unexpected properties animate -> replace `transition: all`. (perf, cheatsheet)
- Element shifts 1px when motion starts/ends -> `will-change: transform`, only once seen. (perf, cheatsheet)
- Long list scrolls slowly -> virtualize. (cheatsheet)

Diagnosis order (most to least frequent cause): which properties animate (layout, then box-shadow/border-radius); jank coincides with page being busy; React re-rendering per frame; worse as content grows; animated CSS variable or old Motion shorthand; blur above 20px; only then `will-change`. (perf)
- Confirm with the DevTools Performance panel (dropped frames, long tasks) and Animations panel (slow motion); profile on a real mid-range phone via remote debugging; CPU throttling models a slow CPU, not a weak GPU or small memory. (perf)
- Scale reference: a layout recalculation on a complex page can exceed 100ms, about a dozen missed frames. (perf)
- Animating a sidebar's margin-left pushes the neighbouring dashboard content every frame; `translateX` does not. (perf)
- Finding format: element and file:line, cause, before, after, verified (code vs device recording); order findings layout before paint, busy-thread before idle. (perf)

## 5. Recipes worth keeping

- Button press: `:active` scale 0.97, transform 160ms ease-out token. (animate-recipes)
- Dropdown/popover/menu/select: origin at trigger, opacity + scale 0.95 from `data-starting-style`/`data-ending-style`, 200ms ease-out. (animate-recipes)
- Tooltip: scale 0.97, 125ms ease-out, `data-instant` 0ms for neighbours after the first. (animate-recipes)
- Modal: centered origin, scale 0.96 + opacity, 250ms ease-out; backdrop opacity 250ms. (animate-recipes)
- Drawer/sheet: `translateY(100%)` to 0, 500ms `--ease-drawer`. (animate-recipes)
- Toast: `@starting-style` opacity 0 + `translateY(100%)`, 400ms `ease`; reflow of stacked toasts tuned by eye. (animate-recipes)
- Accordion: height + opacity 200ms ease-out, `overflow: hidden`, measured height. (animate-recipes)
- Group stagger (occasional surfaces): opacity 0 + 8px rise, 300ms ease-out, delays 50/90/120ms. (animate-recipes)
- Hold to confirm: clip-path fill 2s linear, 200ms release, scale 0.97. (animate-recipes)
- Tab indicator colour change: duplicate tab list styled active, clip-path inset animated 250ms ease-in-out token. (animate-recipes)
- Drag to dismiss: velocity > 0.11 or distance threshold, pointer capture, damping, spring `duration 0.5 bounce 0.2`. (animate-recipes)
- Crossfade masking: blur 2px + opacity 0.7 over 200ms `ease`; keep under 20px. (animate-recipes)
- WAAPI clip-path reveal: 1000ms, `cubic-bezier(0.77, 0, 0.175, 1)`, fill forwards. (animate-recipes)
- Scroll reveal (marketing only): clip-path 600ms ease-in-out token, trigger once with `useInView { once: true, margin: "-100px" }`. (animate-recipes)
- Removal with siblings closing the gap: `popLayout`, `layout`, exit opacity 0 + scale 0.95, 0.2s ease-out token. (choreograph-recipes)
- Crossfade in resizing container: height 0.27s `cubic-bezier(0.25, 1, 0.5, 1)`, content scale 0.96 + opacity, duration `clamp(0.15, delta/500, 0.27)`, `popLayout`. (choreograph-recipes)
- Direction-aware steps: x 110% * direction, spring 0.5s bounce 0, `custom` on both parent and child, Back/Continue buttons with `layout`. (choreograph-recipes)
- Checkbox draw sequence: square 0.6s then checkmark 0.4s starting at 0.5s, `cubic-bezier(0.645, 0.045, 0.355, 1)`, `forwards`. (choreograph-recipes)
- CSS hero stagger with `--delay` (marketing): 0/0/120/200ms, 0.6s ease, rise 10px, fill `both`. (choreograph-recipes)
- Morph between two rich states: wait mode, or duplicate-view crossfade with per-pair hardcoded values. (choreograph-recipes)
- Carry: animate the parent container so shared-layout children travel with it. (choreograph-recipes)
- Imperative orchestration with `useAnimate`: track and stop in-flight animations, await resets before idle loop. (choreograph-recipes)

## 6. Vocabulary (terms an implementer needs to name an effect)

- Fade in/out: opacity change on appear/disappear. (vocab)
- Slide in: enter from off-screen edge. (vocab)
- Scale in: grows from smaller, usually with fade. (vocab)
- Pop in: appears with slight overshoot. (vocab)
- Reveal: uncovered gradually, via clip-path or mask. (vocab)
- Stagger: items animate one after another with small delay. (vocab)
- Orchestration: timing several animations as one motion. (vocab)
- Fill mode: whether first/last frame styles hold before/after (forwards, both). (vocab)
- Transform origin: the anchor a scale or rotation grows from. (vocab)
- Origin-aware animation: element grows out of its trigger instead of its centre. (vocab)
- Crossfade: one fades out while another fades in, same spot. (vocab)
- Morph: one shape turns into another. (vocab)
- Shared element transition: element travels and transforms between positions. (vocab)
- Layout animation: size/position changes animate instead of snapping. (vocab)
- Accordion/collapse: section expands and collapses height. (vocab)
- Direction-aware transition: slides one way forward, opposite going back. (vocab)
- Press/tap feedback: subtle scale-down on click. (vocab)
- Hold to confirm: progress fill while held. (vocab)
- Swipe to dismiss: drag off-screen to close. (vocab)
- Rubber-banding: resistance and snap-back past a boundary. (vocab)
- Shake/wiggle: quick side-to-side jitter for error or rejection. (vocab)
- Skeleton/shimmer: placeholder with moving sheen while loading. (vocab)
- Number ticker: digits rolling or counting to a value. (vocab)
- Tabular numbers: fixed-width digits so numbers do not shift as they change. (vocab)
- Interruptible animation: can be redirected mid-flight. (vocab)
- Also useful: pulse (gentle repeating scale/opacity), text morph (character-by-character change), spring/bounce/damping (physics terms). (vocab)

## 7. Conflicts and hard limits

Contradictions and tensions across the files:
- "No approximated values; every curve from the codebase tokens or the tables" (animate) versus curves used in the recipes that are not in the token set: `cubic-bezier(0.25, 1, 0.5, 1)`, `cubic-bezier(0.645, 0.045, 0.355, 1)`, Motion `"easeOut"`, CSS `ease` on 0.6s stagger and on toast, blur crossfade `ease`. (animate vs choreograph-recipes, animate-recipes)
- "Never built-in ease-out on a deliberate animation" (animate) versus choreograph-recipes using built-in `"easeOut"` for content fade and for stagger delays, and `ease` (not custom) for the toast and hover. The toast `ease` is justified as component personality. (animate vs choreograph-recipes)
- Stagger budgets: 30-80ms steps and under about 300ms total (animate, choreograph) versus the marketing allowance of 100-150ms steps on 0.5-0.6s (choreograph) and a recipe whose delays reach 200ms on 600ms (choreograph-recipes, about 800ms total). Treat the longer values as marketing only. The animate stagger recipe uses 50/90/120ms, steps of 50/40/30ms, which sits at the edge of the 30-80ms range.
- Exits "shorter and simpler" (choreograph) versus recipes where enter and exit use the same duration and transition (popover 200ms both ways, modal 250ms both ways). (choreograph vs animate-recipes)
- Reduced motion: "same timing, opacity only" (animate) versus "drop the delays and movement" (choreograph, choreograph-recipes). Pick: opacity-only, no transform, no stagger delay.
- "Transform and opacity only" (animate, perf) versus the container-resize recipe animating `height` (choreograph-recipes) and accordion `height` (animate allows only for accordions). Perf also says layout animation can be free on small absolute elements but prefers `scale()` when it gives the look.
- `clip-path` listed as a sanctioned property (animate) while perf lists it only as "gaining support" for acceleration; tab-indicator and hold-to-confirm rely on it.
- Hover: "tens of times a day, near-imperceptible or nothing" (animate, find) versus the hover example `scale(1.05)` in the reduced-motion snippet. A 1.05 hover scale is not near-imperceptible. (animate)
- Opposing tool advice: "cheapest tool that works" and "CSS animations beat JS under load" (animate) versus "do not avoid JS animation; main-thread only suffers when the page is busy" (perf). Compatible if read as: CSS for simple and busy-page motion, Motion for complex.
- Percentage transforms: preferred (animate) although Chrome historically did not accelerate them (perf); perf says keep them anyway.
- Mixed lists: "UI animations stay under 300ms" versus modal/drawer 500ms and toast 400ms; documented exceptions, but a pipeline checker must carry the exception list.

Rules stated as absolutes ("never"/"always"/"forbidden"):
- Never animate 100+/day or keyboard-initiated actions. (animate, find)
- Never `scale(0)`; never `ease-in` on UI; never `transition: all`. (animate, perf)
- Never drive a child's transform from a parent CSS variable. (animate, perf)
- Uniform stagger is forbidden; never stagger high-frequency UI; never animate parent entrance plus child stagger; choreography never blocks interaction. (choreograph)
- Never conclude "it is fine" from a fast machine; never apply `will-change` before seeing the problem. (perf)
- Reduced motion and hover gating "ship with the animation, every time". (animate)
- Never hand-roll a curve; never approximate values. (animate)
- Re-animating a scroll reveal on every scroll-by is a defect; fire once. (animate-recipes)

Rules that assume a specific library or framework:
- Base UI: `var(--transform-origin)`, `data-starting-style`, `data-ending-style`, `data-instant`. (animate, animate-recipes)
- Motion (motion.dev, formerly Framer Motion) and its React API: version 14.2+ for accelerated x/y/scale, `AnimatePresence` (`popLayout`, `wait`, `sync`, `custom`), `MotionConfig`, `layout`/`layoutId`, `stagger`, `delayChildren`, `useAnimate`, `useInView`, `useReducedMotion`, motion values. (animate, choreograph, perf)
- React: `ref.current.style` versus state, `useEffect` mount flag, `react-use-measure` for height measurement. (perf, animate-recipes, choreograph-recipes)
- Vaul (drawers) and Sonner (toasts) cited as the reference implementations. (perf, animate-recipes)
- Browser features: CSS `@starting-style`, WAAPI, `clip-path`, `filter: drop-shadow` composited in Chrome (other engines may repaint; measure), Safari blur cost. (animate, perf)
- GSAP is named as a main-thread rAF driver (no rules for it). (perf)
- Hold-to-confirm and tab-indicator recipes rely on `:active` and `clip-path`; the tab recipe assumes a duplicated tab list in the DOM. (animate-recipes)
- Drag recipe assumes pointer events (pointer capture). (animate-recipes)

## 8. Not relevant to web app screens

- Scroll reveal, parallax, scroll-driven, page/view transitions as marketing effects: marketing surfaces only per the source; recipe kept in section 5 flagged marketing-only.
- Hero/first-run CSS stagger, wave entrances, 100-150ms steps: marketing/first-run, not product screens.
- Attention loops, idle, float, orbit, marquee, typewriter, line drawing, before/after slider, 3D tilt, perspective, skew: decorative or marketing; only the attention-loop timing is kept.
- Dynamic Island morph, rich-state duplicate-view crossfade: native-app flavoured; kept only as a one-line recipe.
- Icon motion-line choreography (icon + background + lines, `times: [0.7, 0.9]`, repeat-action skip-buildup): icon micro-interaction, little use on dashboards/tables/forms.
- Shared `layoutId` image-to-bin "carry" example: illustrative; the carry principle is kept.
- Animation vocabulary entries for principles (anticipation, follow-through, squash and stretch, frame rate, compositing, layout thrashing, hardware acceleration): background theory; no numeric rule.
- React Native / Expo (`animate-expo`), `review-animations`, `improve-animations`, `remove-animations`, `pick-ui-library`: referenced by name only; files not provided, no rules extracted.
- Skill boilerplate (initial responses, output formats, tone, prompt-injection notes): agent behaviour, not design rules.
