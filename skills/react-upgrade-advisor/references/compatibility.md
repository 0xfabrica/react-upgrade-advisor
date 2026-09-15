# Compatibility that changes the decision

## Next.js

Read the installed package's docs before online examples. Look for `node_modules/next/dist/docs/` in releases that ship them; otherwise use version-matched official documentation.

App Router uses React bundled by Next. Pages Router uses the application's dependency. Inspect both in hybrid apps. The inspector reads the development bundle's version as package evidence; it does not execute a route or validate the production renderer. If a new API is the purpose of the upgrade, verify a representative production build through framework diagnostics, a test harness or a temporary local diagnostic component, then remove the probe. Do not expose internal version/debug endpoints publicly.

A concrete example: Next 16.3.3 and 16.3.5 both bundle `19.3.0-canary-cbb046ab-20260731`, despite a manifest being able to declare React 19.3.0. This observation was checked on September 15, 2026, and must be rechecked for later releases. The mere existence of an export does not prove it has the stable release's final semantics.

Never import `next/dist/compiled/react` into application code or override framework React/RSC aliases to unlock a feature. Align Next's ESLint config when that package is used. A React major bump is not permission to enable `cacheComponents`, change request caching, swap bundlers or replace routing.

Sources: [Next installation](https://nextjs.org/docs/app/getting-started/installation), [16.3.3 bundled source](https://github.com/vercel/next.js/blob/v16.3.3/packages/next/src/compiled/react/cjs/react.development.js), [16.3.5 bundled source](https://github.com/vercel/next.js/blob/v16.3.5/packages/next/src/compiled/react/cjs/react.development.js).

## Vite, React Router and custom SSR

Verify the app's installed React/DOM pair and framework/build-plugin peers. Inspect aliases and deduplication configuration: metadata resolution alone can miss the renderer the bundler selects. For SSR, verify both server HTML and client hydration after the build. A successful client-only page does not validate streaming or server integration.

For other RSC frameworks, follow that framework's integration guidance. React's underlying RSC framework APIs can change independently of the public component APIs; do not manually bump `react-server-dom-*` solely because the root React version changed. [React RSC versioning](https://react.dev/reference/rsc/server-components#how-do-i-build-support-for-server-components).

## Monorepos and libraries

Identify who owns the lockfile, dependency catalog, overrides and renderer. Select a package by path/name, then inspect every affected application or shared library. One upgraded root package does not prove a nested app changed. Conversely, a shared catalog update may affect more apps than the requested one.

When package-manager signals conflict, inspect CI and repository instructions before installing. Do not choose based on whichever binary happens to be installed globally. The helper detects candidate workspace boundaries; it does not parse every workspace pattern or nested package-manager configuration.

For libraries, keep React in peers, preserve the promised support range unless the release intentionally changes it, and test representative consuming applications. Test/dev React should not become a bundled runtime dependency. Different React versions in separate applications can be intentional; two React instances inside one rendered tree can cause hooks failures.

## Consumer-specific peers

Record each important consumer's exact installed version, declared peer range and effective React resolution. Prioritize editor frameworks, dialogs, calendars, charts, animation, state stores, error reporting and test renderers used by the app. A broad `^19` peer range is compatibility metadata, not browser proof. If an optional peer is absent, inspect `peerDependenciesMeta` before labeling it a blocker.

For Recharts versions that use `react-is`, follow the maintainer's alignment guidance. Inspect the `react-is` selected by **Recharts**; a legacy copy used by ESLint's `prop-types` can coexist. Do not apply a global override to every `react-is` consumer. A targeted direct dependency or resolution should be justified by the graph. [Recharts installation](https://github.com/recharts/recharts#installation).

Use the project's native resolver for Yarn PnP. The included helper deliberately does not execute `.pnp.cjs`. Yarn aliases, workspace protocols, pnpm catalogs and Git dependencies require native-manager follow-up; no semver verdict is inferred from an unparsed string.

## Native renderers

Expo/React Native versions constrain React. Use their upgrade matrix and validation tools instead of installing web React “latest”. A monorepo containing native and web packages may need different targets and separate validation. The helper detects native dependencies only in the selected package/its resolution, not every sibling application. [Expo upgrade process](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

## Crossing into React 19

The official guide recommends React 18.3's warning stage before React 19. Assess the JSX transform, removed legacy APIs, ref/type changes and error-reporting integration. Use the guide's codemods only for matching code paths, inspect their diffs, and keep them separate from unrelated refactors. Applications on earlier majors may need additional framework-specific staging. Do not run the full major migration recipe for an already-19.x app without evidence that it needs it. [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide).
