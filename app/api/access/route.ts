import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/convex-server";
import { apiError, createRequestId, statusForError } from "@/lib/api-errors";

export async function POST() {
  const requestId = createRequestId();
  const { getToken, sessionClaims, userId } = await auth();
  if (!userId) return apiError("Authentication is required", 401, requestId);

  const user = await currentUser();
  const verifiedEmail = user?.primaryEmailAddress?.emailAddress;
  if (!verifiedEmail) return apiError("A verified email is required", 422, requestId);

  const token = sessionClaims?.aud === "convex" ? await getToken() : await getToken({ template: "convex" });
  if (!token) return apiError("Convex authentication is unavailable", 503, requestId);

  try {
    const access = await ensureCurrentUser(token, verifiedEmail);
    return NextResponse.json(access, { headers: { "cache-control": "private, no-store", "x-request-id": requestId } });
  } catch (error) {
    console.error("workspace access provisioning failed", requestId, error);
    return apiError("This account does not have workspace access", statusForError(error, 403), requestId);
  }
}
