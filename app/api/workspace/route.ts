import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createRecord, getWorkspaceSnapshot, updateLeadStage, updateTaskStatus } from "@/lib/convex-server";
import { apiError, createRequestId, statusForError } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("task-status"), id: z.string().min(1), status: z.string().min(1) }),
  z.object({ action: z.literal("lead-stage"), id: z.string().min(1), stage: z.string().min(1) }),
  z.object({
    action: z.literal("create"),
    type: z.enum(["task", "lead", "content"]),
    title: z.string().trim().min(1).max(200),
    owner: z.string().trim().min(1).max(100),
  }),
]);

async function getAuthenticatedSession() {
  const { getToken, sessionClaims, userId } = await auth();
  if (!userId) return null;

  const token = sessionClaims?.aud === "convex" ? await getToken() : await getToken({ template: "convex" });
  return token ? { token } : null;
}

export async function GET() {
  const requestId = createRequestId();
  const session = await getAuthenticatedSession();
  if (!session) return apiError("Authentication is required", 401, requestId);

  try {
    const snapshot = await getWorkspaceSnapshot(session.token);
    if (!snapshot) return apiError("Workspace not initialized", 503, requestId);
    return NextResponse.json(snapshot, { headers: { "cache-control": "private, no-store", "x-request-id": requestId } });
  } catch (error) {
    console.error("workspace load failed", requestId, error);
    return apiError("Could not load the workspace", statusForError(error), requestId);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const session = await getAuthenticatedSession();
  if (!session) return apiError("Authentication is required", 401, requestId);

  if (process.env.DEPLOYMENT_READ_ONLY === "true") {
    return apiError("This deployment is read-only", 403, requestId);
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid workspace change", 422, requestId);

  try {
    if (parsed.data.action === "task-status") {
      await updateTaskStatus(session.token, parsed.data.id, parsed.data.status);
      return NextResponse.json({ ok: true, requestId }, { headers: { "x-request-id": requestId } });
    }
    if (parsed.data.action === "lead-stage") {
      await updateLeadStage(session.token, parsed.data.id, parsed.data.stage);
      return NextResponse.json({ ok: true, requestId }, { headers: { "x-request-id": requestId } });
    }
    const { type, title, owner } = parsed.data;
    const id = await createRecord(session.token, { type, title, owner });
    return NextResponse.json({ ok: true, id, requestId }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    console.error("workspace mutation failed", requestId, error);
    return apiError("Could not save this change", statusForError(error), requestId);
  }
}
