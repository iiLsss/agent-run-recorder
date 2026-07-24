# Frontend Guidelines

## Component design

- A page coordinates a use case; it does not contain fixtures or domain
  algorithms.
- A business component should have one reason to change.
- Extract a component when it owns behavior, accessibility, or a coherent
  business concept. Do not extract wrappers solely to reduce line count.
- Pages should remain under 300 lines; normal business components under 200
  lines; functions under 50 lines.
- Build transformed view models before JSX. JSX may map prepared collections but
  must not parse, group, sort, or aggregate domain data.

## TypeScript

- Keep `strict` enabled.
- Use domain unions for closed states instead of free-form strings.
- Prefer `interface` for data contracts and `type` for unions/compositions.
- Do not use `any`. Use `unknown` at trust boundaries and narrow it.
- Keep component props explicit and local to the component unless they form a
  shared domain contract.

## State and data

- Keep state at the lowest owner that coordinates it.
- Derive filtered data with pure utilities and `useMemo` only when useful.
- Keep mock data in `data/`; replace it through repository functions.
- Do not import mock fixtures from production UI components directly when a
  repository boundary exists.
- Preserve `unknown` values from the product model; never fabricate estimates.

## Styling

- `tokens.css` owns colors, spacing, radii, typography, shadows, and motion.
- `globals.css` owns reset and document-level defaults only.
- Pages and components use colocated CSS Modules.
- Use semantic variables such as `--color-text-muted`, not raw palette values.
- Keep the design optimized for the 1440 × 900 desktop reference while allowing
  content compression down to a 1080 px minimum viewport.
- Motion must respect `prefers-reduced-motion`.

## Accessibility

- Use native buttons, inputs, labels, tables, and headings.
- Every icon-only button needs an accessible name.
- Visible focus states are mandatory.
- Do not encode status by color alone; pair color with text.
- Table filtering must be operable with a keyboard.

## Product copy

- Describe results as the user’s historical observations.
- Do not use winner, proof, causal, or “pure Agent effect” language.
- State that raw prompt, response, reasoning, file contents, full command output,
  and complete URLs are not persisted.
- Clearly separate Task overall results from configuration observations.

## Tests

- Test pure transformations without rendering.
- Test page behavior through visible text, roles, and user-observable outcomes.
- Avoid implementation-detail selectors.
- Add regression tests for filters, unknown states, and scope-sensitive copy.

## Imports

- Use relative imports inside a module.
- Cross-module imports must go through a future public module entry point.
- Shared primitives may be imported from `src/shared`.
- Modules must not reach into another module’s internal `data`, `types`, or
  `utils` folders.
