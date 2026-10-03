import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createRecord, getWorkspaceSnapshot, updateLeadStage, updateTaskStatus } from "@/lib/convex-server";

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
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });

  try {
    const snapshot = await getWorkspaceSnapshot(session.token);
    if (!snapshot) return NextResponse.json({ error: "Workspace not initialized" }, { status: 503 });
    return NextResponse.json(snapshot, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("workspace load failed", error);
    return NextResponse.json({ error: "Could not load the workspace" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });

  if (process.env.DEPLOYMENT_READ_ONLY === "true") {
    return NextResponse.json({ error: "This deployment is read-only" }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid workspace change" }, { status: 400 });

  try {
    if (parsed.data.action === "task-status") {
      await updateTaskStatus(session.token, parsed.data.id, parsed.data.status);
      return NextResponse.json({ ok: true });
    }
    if (parsed.data.action === "lead-stage") {
      await updateLeadStage(session.token, parsed.data.id, parsed.data.stage);
      return NextResponse.json({ ok: true });
    }
    const id = await createRecord(session.token, parsed.data);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("workspace mutation failed", error);
    return NextResponse.json({ error: "Could not save this change" }, { status: 500 });
  }
}
