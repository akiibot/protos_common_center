import { ConvexError } from "convex/values";

const statusByCode: Record<string, number> = {
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INVITATION_REQUIRED: 403,
  MEMBERSHIP_REQUIRED: 403,
  MEMBERSHIP_DEACTIVATED: 403,
  OWNER_REQUIRED: 403,
  OWNER_PROTECTED: 409,
  SELF_DEACTIVATION_FORBIDDEN: 409,
  MEMBERSHIP_ALREADY_CLAIMED: 409,
  IDENTITY_CONFLICT: 409,
  INVALID_OWNER_TARGET: 409,
  NOT_FOUND: 404,
  DUPLICATE_EMAIL: 409,
  VERIFIED_EMAIL_REQUIRED: 422,
  INVALID_ROLE: 422,
};

export function getConvexErrorCode(error: unknown) {
  if (!(error instanceof ConvexError) || typeof error.data !== "object" || error.data === null || !("code" in error.data)) {
    return null;
  }
  return typeof error.data.code === "string" ? error.data.code : null;
}

export function statusForError(error: unknown, fallback = 500) {
  const code = getConvexErrorCode(error);
  return code ? statusByCode[code] ?? fallback : fallback;
}

export function createRequestId() {
  return crypto.randomUUID();
}

export function apiError(message: string, status: number, requestId: string) {
  return Response.json({ error: message, requestId }, { status, headers: { "x-request-id": requestId } });
}
