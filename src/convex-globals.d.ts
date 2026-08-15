// The generated Convex `api` type is `typeof` the Convex source modules, so the
// frontend type-check transitively pulls in convex/*.ts. Those files run in the
// Convex runtime and read `process.env`, which the browser tsconfig doesn't
// declare. This ambient declaration satisfies the type-checker only — it has no
// runtime effect and the frontend itself uses import.meta.env, not process.
declare const process: { env: Record<string, string | undefined> };
