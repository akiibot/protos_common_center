import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
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

async function getAuthenticatedActor() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  return {
    userId,
    name: user?.fullName ?? user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? userId,
  };
}

export async function GET() {
  const actor = await getAuthenticatedActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });

  try {
    const snapshot = await getWorkspaceSnapshot();
    if (!snapshot) return NextResponse.json({ error: "Workspace not initialized" }, { status: 503 });
    return NextResponse.json(snapshot, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("workspace load failed", error);
    return NextResponse.json({ error: "Could not load the workspace" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authenticatedActor = await getAuthenticatedActor();
  if (!authenticatedActor) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });

  if (process.env.DEPLOYMENT_READ_ONLY === "true") {
    return NextResponse.json({ error: "This deployment is read-only" }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid workspace change" }, { status: 400 });

  const actor = authenticatedActor.name;
  try {
    if (parsed.data.action === "task-status") {
      await updateTaskStatus(parsed.data.id, parsed.data.status, actor);
      return NextResponse.json({ ok: true });
    }
    if (parsed.data.action === "lead-stage") {
      await updateLeadStage(parsed.data.id, parsed.data.stage, actor);
      return NextResponse.json({ ok: true });
    }
    const id = await createRecord(parsed.data, actor);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("workspace mutation failed", error);
    return NextResponse.json({ error: "Could not save this change" }, { status: 500 });
  }
}
