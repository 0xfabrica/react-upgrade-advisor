# Preparing application code for React 19.3

Versioned guidance checked on **September 15, 2026**. The snippets below are original, generic examples. They contain no application-specific code or data. Check the linked API documentation and the effective framework runtime before using them; a framework's bundled canary can differ from stable React 19.3 even when its exports have the same names.

## 1. Turn the release into a source review

Inspect the selected app's source roots and configuration. Search for these patterns with the available code-search tool, then inspect their callers. Matches identify review candidates, not changes to perform automatically.

| Search for | Determine | Result to record |
| --- | --- | --- |
| Mounted-state effects, `typeof window`, `ssr: false`, browser API reads | Is this browser-only content, lazy loading, a portal workaround, or hydration-sensitive state? | Keep the existing protection or adopt `browser()` for a bounded component. |
| `startTransition`, `useTransition`, Suspense and route/panel motion | Is feedback urgent? Are state, focus and scroll preserved? Does the requested task benefit from a transition? | Preserve behavior or implement one measured ViewTransition use case. |
| Wrapper refs used only for focus, events or observation | Does the wrapper also own layout, scrolling, semantics or styles? | Keep structural wrappers; consider a Fragment ref only where appropriate. |
| Context providers and client boundaries | Does the provider only forward serializable data, or own client state/effects? | Simplify only the former when the actual RSC runtime supports it. |
| HTML sinks, sanitizers and CSP | Is Trusted Types adoption actually requested, and are all producers compatible? | Preserve policies by default; plan a separate integration change if needed. |
| `useDeferredValue`, external stores, forms, refs, error boundaries | Which interactions depend on behavior changed or fixed by the target release? | Add or run regression coverage for the app's actual use. |
| JSX transform, legacy ReactDOM calls and outdated test renderers | Is this an older-major migration rather than a 19.x minor update? | Follow the official major migration guide before these API examples. |

The output should identify real files and the reason for each decision:

| File or component | Observed pattern | Decision | Documentation/runtime evidence | Verification |
| --- | --- | --- | --- | --- |
| The user's actual file | Current mechanism and why it exists | Required fix / scoped adaptation / preserve | Specific API or migration reference, and available runtime | Observable interaction or regression test |

Keep this report in the user's project or response. Do not send their source code, dependency report or identifiers back to the skill repository. A request to upgrade an app does not authorize publishing that app's code.

## 2. Browser-only content: an effect-to-Suspense example

Suppose a badge intentionally displays the browser's language after hydration. The existing component may use state just to postpone the read:

```tsx
'use client';
import { useEffect, useState } from 'react';

export function LanguageBadgeBefore() {
  const [language, setLanguage] = useState<string | null>(null);
  useEffect(() => { setLanguage(navigator.language); }, []);
  return <span>{language ?? 'Reading browser language…'}</span>;
}
```

A React 19.3 version can express the browser dependency directly:

```tsx
'use client';
import { Suspense, use } from 'react';
import { browser } from 'react-dom';

function BrowserLanguage() {
  use(browser());
  return <span>{navigator.language}</span>;
}

export function LanguageBadge() {
  return (
    <Suspense fallback={<span>Reading browser language…</span>}>
      <BrowserLanguage />
    </Suspense>
  );
}
```

This example deliberately renders fallback HTML on the server. Test the server response without `navigator`, the browser result after hydration, and the absence of new reporting errors. Keep other mounted-state effects when they handle subscriptions, initialization, focus or a known portal integration issue. This change is not a replacement for lazy-loading a large editor bundle. [React DOM browser reference](https://react.dev/reference/react-dom/browser).

## 3. A bounded ViewTransition adaptation

For a details panel already controlled by state, preserve its button and panel identity while letting a non-urgent change animate. Existing animations on the same panel should be evaluated before adding another system.

```tsx
'use client';
import { startTransition, useId, useState, ViewTransition } from 'react';

export function DetailsPanel() {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-controls={panelId}
        aria-expanded={expanded}
        onClick={() => startTransition(() => setExpanded(value => !value))}
      >
        Details
      </button>
      <ViewTransition update="details-resize" default="none">
        <section id={panelId} aria-label="Details">
          {expanded ? <p>Additional information is available here.</p> : null}
        </section>
      </ViewTransition>
    </>
  );
}
```

Apply the motion rule in the app's appropriate stylesheet and adapt its duration to the existing design:

```css
::view-transition-group(.details-resize) {
  animation-duration: 160ms;
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(.details-resize),
  ::view-transition-old(.details-resize),
  ::view-transition-new(.details-resize) {
    animation: none;
  }
}
```

Check repeated clicks, keyboard focus, final expanded state, reduced motion, and behavior without browser animation support. Do not put controlled input updates in this transition. The example makes no shared-name or framework-route assumptions. [ViewTransition reference](https://react.dev/reference/react/ViewTransition).

## 4. Replace only a wrapper that is genuinely unnecessary

An existing `div` ref that finds the first input with `querySelector` can sometimes be replaced by a group ref. Only do this if removing that `div` leaves layout, accessibility and event behavior intact.

```tsx
'use client';
import { Fragment, useRef, type FragmentInstance } from 'react';
import type {} from 'react-dom';

export function FieldGroup() {
  const fields = useRef<FragmentInstance>(null);
  return (
    <>
      <button type="button" onClick={() => fields.current?.focus()}>
        Focus first field
      </button>
      <Fragment ref={fields}>
        <label>Given name <input name="givenName" autoComplete="given-name" /></label>
        <label>Family name <input name="familyName" autoComplete="family-name" /></label>
      </Fragment>
    </>
  );
}
```

The type-only DOM import supplies React DOM's augmentation of `FragmentInstance`. Use the explicit Fragment form; the shorthand cannot carry a ref. Check focus order and the rendered DOM. This is not a substitute for a dialog focus trap. [Fragment reference](https://react.dev/reference/react/Fragment).

## 5. Finish the application's preparation

For each selected source change, compare the old and new behavior. Keep source adaptations reviewable separately from dependency changes. Preserve framework-owned renderers, state persistence, accessibility, error recovery and the app's established mobile behavior. Do not use a newly available API solely to make the diff larger.

Complete [the verification plan](verification.md) for the changed surfaces and the repository's required checks. Record whether examples were merely type-checked or actually exercised in a browser; type-checking alone does not establish focus, hydration or animation behavior.

A complete implementation report includes the selected React/framework versions, the source map above, applied changes, reasons for preserved patterns, observed test results and remaining limits. If no source adaptation is needed, that conclusion must follow from the review rather than from only changing `package.json`.

Example validation on September 15, 2026: all four TSX snippets passed strict checking with TypeScript 5.9.3 and React/DOM types 19.3.0, and server rendering with React/DOM 19.3.0. The language examples rendered their server fallback without a browser global. Focus, animation and hydration interactions still require the target application's browser checks; these checks were not simulated as completed.
