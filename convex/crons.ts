import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Rate-limit buckets are per-email, so the table would otherwise keep one row
// for every address ever submitted. Expired windows carry no state worth
// keeping. Hourly rather than daily: the global limit permits ~86k new buckets
// a day, so a once-a-day sweep would leave a large live set between runs (the
// job itself drains in batches, so each run finishes the backlog).
crons.hourly(
  "cleanup expired rate limits",
  { minuteUTC: 0 },
  internal.rateLimit.cleanupExpired,
  {},
);

export default crons;
