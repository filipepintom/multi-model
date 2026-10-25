# Spec — <title>

## Goal

<One sentence: what problem it solves and for whom.>

## Decisions

The choices that change the product, the cost or the risk, and that the user should validate at gate 1. At most ~7. The rest goes into "Assumed".

### D1 — <the decision, as a question: "Where does the data live?">

- **Context:** <why this matters here, in one or two sentences>
- **Options:**
  - A — <option> · for: <…> · against: <…>
  - B — <option> · for: <…> · against: <…>
- **Recommendation:** <A>, because <reason tied to the goal and the known preferences>
- **Cost of changing later:** <low | medium | high> — <why>
- **Status:** proposed | accepted | changed by the user → <what they chose and why>

### Assumed

- <minor decisions taken by the agent, one line each, that the user can challenge if they want>

## MVP scope

- <feature>

## Out of scope

- <what explicitly does not go into this version>

## Acceptance criteria

Each criterion is testable: someone can write a test that passes or fails.

- [ ] AC1 — <given X, when Y, then Z>
- [ ] AC2 — …

## Stack and architecture

- Stack: <language, framework, database>
- Components: <main modules and how they communicate>
- Architecture choices with trade-offs go into the **Decisions** section, not here.

## Design direction

Only for projects with an interface. With the `studio:impeccable` skill, summarize `PRODUCT.md` and `DESIGN.md` here and link them.

- Mode: <operate (app, dashboard) | persuade (landing) | read (docs) | experience (portfolio)>
- Who uses it, where and in what situation: <e.g. on the phone, at the end of the month, to see where the money went>
- Tone: <3 adjectives>
- References: <products or sites whose visual level we want> · Anti-references: <what to avoid>
- Density: <compact | balanced | airy>
- Constraints: <brand, required colors, accessibility, dark mode>

## Data and integrations

<Main entities, external APIs, authentication.>

## Verification

- Command: `<contents of .studio/verify>`
- UI: <flows to check in the browser, if applicable>

## Risks

1. <risk → mitigation>
