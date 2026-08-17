#!/usr/bin/env node
/**
 * Regenerate `convex/disposableDomains.ts` from the community blocklist.
 *
 * Source: https://github.com/disposable-email-domains/disposable-email-domains
 * (maintained since 2014, new domains go through a validation process).
 *
 * Run `npm run update:disposable-domains` and commit the result. The list is
 * generated rather than fetched at runtime so signup validation stays offline
 * and deterministic — a signup must never depend on GitHub being reachable.
 */

import { writeFile } from "node:fs/promises";

const SOURCE =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf";
const OUTPUT = new URL("../convex/disposableDomains.ts", import.meta.url);

// Domains we block on top of the upstream list.
const EXTRA = ["tempmail.dev", "mytemp.email", "inboxbear.com"];

// Sanity floor: the upstream list has thousands of entries. A tiny result means
// the fetch returned an error page, and silently shipping that would disable
// disposable-domain blocking entirely.
const MIN_EXPECTED = 5000;

// Never block real mailbox providers, whatever upstream says.
const NEVER_BLOCK = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
]);

const response = await fetch(SOURCE);
if (!response.ok) {
  throw new Error(`Failed to fetch blocklist: ${response.status} ${response.statusText}`);
}

const domains = new Set(
  (await response.text())
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0 && !line.startsWith("#")),
);

for (const domain of EXTRA) domains.add(domain);

const blocked = [];
for (const domain of NEVER_BLOCK) {
  if (domains.delete(domain)) blocked.push(domain);
}
if (blocked.length > 0) {
  console.warn(`Removed real providers present upstream: ${blocked.join(", ")}`);
}

if (domains.size < MIN_EXPECTED) {
  throw new Error(`Only ${domains.size} domains parsed; expected at least ${MIN_EXPECTED}`);
}

const sorted = [...domains].sort();
const file = `// GENERATED FILE — do not edit by hand.
// Run \`npm run update:disposable-domains\` to refresh.
//
// Source: https://github.com/disposable-email-domains/disposable-email-domains
// Domains: ${sorted.length}
//
// Stored as one newline-delimited string rather than an array literal: it keeps
// the source a third smaller and gives a clean one-domain-per-line diff.

const RAW = \`${sorted.join("\n")}\`;

export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set(RAW.split("\\n"));
`;

await writeFile(OUTPUT, file, "utf8");
console.log(`Wrote ${sorted.length} domains to convex/disposableDomains.ts`);
