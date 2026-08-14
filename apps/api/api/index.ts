// Vercel's entry point for the API. Everything real is in src/serverless.ts.
//
// It imports the *compiled* application on purpose. Vercel's Node runtime transpiles a
// TypeScript function with esbuild, and esbuild cannot emit `design:paramtypes` — the
// decorator metadata Nest reads to resolve constructor injection. A function built that way
// starts and then fails on the first request with an undefined dependency. `nest build`
// (tsc) runs first in the build command and bakes that metadata into dist/, so this file is
// the only thing esbuild has to understand, and it has no decorators in it.
//
// It is excluded from tsconfig.json for the same reason: dist/ does not exist on a clean
// clone, and `npm run typecheck` must pass there. The two lines below are covered by the
// deployment itself — a wrong path here is a failed build, not a silent bug.
export { default } from '../dist/serverless.js';
