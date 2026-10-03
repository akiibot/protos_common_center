import assert from "node:assert/strict";
import test from "node:test";
import { ConvexError } from "convex/values";
import { getConvexErrorCode, statusForError } from "./api-errors.ts";

test("maps authentication and authorization errors", () => {
  assert.equal(statusForError(new ConvexError({ code: "UNAUTHENTICATED" })), 401);
  assert.equal(statusForError(new ConvexError({ code: "FORBIDDEN" })), 403);
  assert.equal(statusForError(new ConvexError({ code: "MEMBERSHIP_DEACTIVATED" })), 403);
});

test("maps scope, conflict, and validation errors", () => {
  assert.equal(statusForError(new ConvexError({ code: "NOT_FOUND" })), 404);
  assert.equal(statusForError(new ConvexError({ code: "OWNER_PROTECTED" })), 409);
  assert.equal(statusForError(new ConvexError({ code: "VERIFIED_EMAIL_REQUIRED" })), 422);
});

test("unknown errors remain private server errors", () => {
  assert.equal(getConvexErrorCode(new Error("private detail")), null);
  assert.equal(statusForError(new Error("private detail")), 500);
});
