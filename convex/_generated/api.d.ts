/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as email from "../email.js";
import type * as emailValidation from "../emailValidation.js";
import type * as http from "../http.js";
import type * as redemptionCode from "../redemptionCode.js";
import type * as stripeSecurity from "../stripeSecurity.js";
import type * as stripeSignature from "../stripeSignature.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  email: typeof email;
  emailValidation: typeof emailValidation;
  http: typeof http;
  redemptionCode: typeof redemptionCode;
  stripeSecurity: typeof stripeSecurity;
  stripeSignature: typeof stripeSignature;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
