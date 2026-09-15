# Evidence that an upgrade works

Choose checks based on actual application behavior. This is a menu, not a requirement to invent a payment flow or native device test for every project.

## Static and runtime layers

Run the repository's required checks from its scripts and CI: type generation where needed, types, lint, relevant unit/integration tests and a production build. Use the selected manager and the same Node/toolchain as the app. Include the existing production dependency audit when required; a new audit warning needs classification, not automatic unrelated upgrades.

Compare known baseline failures with the candidate using the same environment. Record blockers as blockers. Do not claim the upgrade passed because a command returned 0 while application assertions failed, or because static helpers passed without rendering React.

## Browser acceptance matrix

| Surface present in the application | Evidence to collect |
| --- | --- |
| SSR, RSC or streaming | Useful initial HTML, successful hydration, Suspense/loading/error recovery and no new console exceptions. |
| Navigation | Direct load, client navigation and back/forward; preserved state, expected remounts, scroll and loading behavior. |
| Forms and actions | Validation, pending/disabled state, exactly one submission, errors, retry and retained user input. |
| Dialogs, menus and portals | Open/close, Escape, focus trap/return, keyboard operation and no detached-node errors. |
| Rich-text editor | Cursor and selection, typing/paste, formatting, undo/redo, persistence and reopening. |
| Dates and calendars | Locale/timezone behavior, range semantics, keyboard focus, min/max constraints and hydration. |
| Charts and external stores | Populated/empty/error states, tooltips, resize, subscriptions and consumer-specific peer resolution. |
| Chat or continuously updating UI | Streaming updates, input responsiveness, cancel/retry if present, scroll ownership and retained draft/history. |
| Mobile/PWA | Real route at the product's supported widths, overflow, focus, safe areas and keyboard behavior on a physical device where available. |
| Error reporting | Error boundaries and reporting still work; no new silent or duplicate reports after renderer changes. |

Use representative test data and authorized environments. Do not submit real purchases or alter live customer data solely to validate an upgrade. Simulated errors belong in a test harness or local interception, not an outage of a shared service.

For layout-sensitive apps, test the supported browser engines and motion/theme settings that affect the changed surface. A 390 px browser viewport is a useful mobile check, but it is not proof of iOS keyboard or standalone-PWA behavior.

## Measuring an optional benefit

Compare before and after on the same data, device and build mode. Select measurements for the actual claim: React commits/renders, input latency, layout shifts, JS weight or server work. Development Fast Refresh timing is not production page-load performance. Capture enough repeated observations to distinguish a change from noise; do not invent a universal improvement threshold.

## Completion record

Include these fields in the response or a project-appropriate report:

- Decision and reason: upgrade, prepare first or wait.
- Research date and official release/compatibility sources.
- Intended, locked/installed and effective runtime versions.
- Own changes, preserved unrelated changes and any staged follow-up.
- Commands and actual pass/fail results, including baseline failures.
- Browser routes, interactions and environments actually exercised.
- Measured benefit if one was claimed; otherwise say it was not measured.
- Remaining uncertainty and the evidence needed to resolve it.
- Recovery point and rollback procedure.
- Separate local, CI and deployed status; do not mark production verified without readback.
