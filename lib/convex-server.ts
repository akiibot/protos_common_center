import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const organizationId = "org_protos";

function getClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
  const apiSecret = process.env.CONVEX_SERVER_SECRET;
  if (!url || !apiSecret) throw new Error("Convex server configuration is unavailable");
  return { client: new ConvexHttpClient(url), apiSecret };
}

export async function getWorkspaceSnapshot() {
  const { client, apiSecret } = getClient();
  return client.query(api.workspace.getWorkspaceSnapshot, { organizationId, apiSecret });
}

export async function updateTaskStatus(id: string, status: string, actor: string) {
  const { client, apiSecret } = getClient();
  return client.mutation(api.workspace.updateTaskStatus, { organizationId, id, status, actor, apiSecret });
}

export async function updateLeadStage(id: string, stage: string, actor: string) {
  const { client, apiSecret } = getClient();
  return client.mutation(api.workspace.updateLeadStage, { organizationId, id, stage, actor, apiSecret });
}

export async function createRecord(input: { type: "task" | "lead" | "content"; title: string; owner: string }, actor: string) {
  const { client, apiSecret } = getClient();
  return client.mutation(api.workspace.createRecord, { organizationId, ...input, actor, apiSecret });
}
