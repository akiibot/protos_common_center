import { NextResponse } from "next/server";
import { createRecord, updateLeadStage, updateTaskStatus } from "@/lib/workspace";

export async function POST(request: Request) {
  const body = await request.json() as Record<string, string>;
  const actor = "Protos team";
  try {
    if (body.action === "task-status") { await updateTaskStatus(body.id, body.status, actor); return NextResponse.json({ ok: true }); }
    if (body.action === "lead-stage") { await updateLeadStage(body.id, body.stage, actor); return NextResponse.json({ ok: true }); }
    if (body.action === "create") { const id = await createRecord({ type: body.type, title: body.title, owner: body.owner }, actor); return NextResponse.json({ ok: true, id }); }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("record mutation failed", error);
    return NextResponse.json({ error: "Could not save this change" }, { status: 500 });
  }
}
