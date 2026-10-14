/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as imports from "../imports.js";
import type * as lib_accessPolicy from "../lib/accessPolicy.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_importPolicy from "../lib/importPolicy.js";
import type * as memberships from "../memberships.js";
import type * as seedData from "../seedData.js";
import type * as testing from "../testing.js";
import type * as workspace from "../workspace.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  imports: typeof imports;
  "lib/accessPolicy": typeof lib_accessPolicy;
  "lib/auth": typeof lib_auth;
  "lib/importPolicy": typeof lib_importPolicy;
  memberships: typeof memberships;
  seedData: typeof seedData;
  testing: typeof testing;
  workspace: typeof workspace;
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
