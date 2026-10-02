import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { activityEvents, contentItems, financeEntries, goals, leads, members, organizations, projects, tasks } from "@/db/schema";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
import type { WorkspaceSnapshot } from "@/lib/types";

const ORG_ID = "org_protos";

export async function getWorkspaceSnapshot(user: ChatGPTUser): Promise<WorkspaceSnapshot> {
  const db = getDb();
  await seedWorkspace(user);
  const [taskRows, leadRows, projectRows, goalRows, memberRows, contentRows, financeRows, activityRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.organizationId, ORG_ID)), db.select().from(leads).where(eq(leads.organizationId, ORG_ID)),
    db.select().from(projects).where(eq(projects.organizationId, ORG_ID)), db.select().from(goals).where(eq(goals.organizationId, ORG_ID)),
    db.select().from(members).where(eq(members.organizationId, ORG_ID)), db.select().from(contentItems).where(eq(contentItems.organizationId, ORG_ID)),
    db.select().from(financeEntries).where(eq(financeEntries.organizationId, ORG_ID)),
    db.select().from(activityEvents).where(eq(activityEvents.organizationId, ORG_ID)).orderBy(desc(activityEvents.createdAt)).limit(8),
  ]);
  return { tasks: taskRows, leads: leadRows, projects: projectRows, goals: goalRows, members: memberRows, content: contentRows, finance: financeRows, activity: activityRows };
}

async function seedWorkspace(user: ChatGPTUser) {
  const db = getDb();
  await db.insert(organizations).values({ id: ORG_ID, name: "Protos", slug: "protos" }).onConflictDoNothing();
  await db.insert(members).values([
    { id: "member_akib", organizationId: ORG_ID, authUserId: user.userId, name: "Akib", role: "Founder", discipline: "Strategy · AI · Business", initials: "AK", color: "#2C8C7B", openTasks: 2 },
    { id: "member_farid", organizationId: ORG_ID, name: "Farid", role: "Creative Developer", discipline: "Web · Graphics · Video", initials: "FK", color: "#D8A246", openTasks: 1 },
    { id: "member_wasik", organizationId: ORG_ID, name: "Wasik", role: "Product Designer", discipline: "UI/UX · Graphics", initials: "WZ", color: "#6879C8", openTasks: 0 },
    { id: "member_toha", organizationId: ORG_ID, name: "Toha", role: "AI Developer", discipline: "Web · ML · AI", initials: "TN", color: "#4B9C63", openTasks: 1 },
    { id: "member_ayesha", organizationId: ORG_ID, name: "Ayesha", role: "Content Lead", discipline: "Photo · Video · Social", initials: "AS", color: "#C76586", openTasks: 2 },
    { id: "member_tasnuva", organizationId: ORG_ID, name: "Tasnuva", role: "Visual Artist", discipline: "Illustration · Brand", initials: "TW", color: "#8C6AC4", openTasks: 1 },
    { id: "member_jarif", organizationId: ORG_ID, name: "Jarif", role: "Operations Lead", discipline: "Planning · Coordination", initials: "JK", color: "#477C91", openTasks: 2 },
  ]).onConflictDoNothing();
  await db.insert(goals).values([
    { id: "goal_revenue", organizationId: ORG_ID, title: "Build repeatable service revenue", owner: "Akib", status: "In Progress", progress: 36, target: "BDT 50,000 committed work", signal: "attention" },
    { id: "goal_brand", organizationId: ORG_ID, title: "Establish a recognizable public brand", owner: "Ayesha", status: "In Progress", progress: 24, target: "Consistent weekly publishing", signal: "at-risk" },
    { id: "goal_delivery", organizationId: ORG_ID, title: "Create a reliable delivery system", owner: "Jarif", status: "In Progress", progress: 48, target: "Reusable client workflow", signal: "on-track" },
  ]).onConflictDoNothing();
  await db.insert(projects).values([
    { id: "project_ecommerce", organizationId: ORG_ID, name: "E-commerce + inventory platform", client: "First client", lead: "Toha", stage: "Active", health: "On track", progress: 62, value: 1500000, dueDate: "2026-10-18", nextMilestone: "Catalog and inventory review" },
    { id: "project_brand", organizationId: ORG_ID, name: "Protos brand launch", client: "Internal", lead: "Ayesha", stage: "Active", health: "Needs attention", progress: 31, value: 0, dueDate: "2026-10-12", nextMilestone: "Publish first founder story" },
    { id: "project_demo", organizationId: ORG_ID, name: "AI service demo collection", client: "Internal", lead: "Farid", stage: "Planning", health: "On track", progress: 18, value: 0, dueDate: "2026-10-28", nextMilestone: "Select three demo verticals" },
  ]).onConflictDoNothing();
  await db.insert(tasks).values([
    { id: "task_agreement", organizationId: ORG_ID, title: "Finalize client agreement template", owner: "Farid", priority: "High", status: "In Progress", dueDate: "2026-10-05", context: "Operations" },
    { id: "task_leads", organizationId: ORG_ID, title: "Complete warm-network follow-up batch", owner: "Jarif", priority: "High", status: "Ready", dueDate: "2026-10-06", context: "Sales" },
    { id: "task_delivery", organizationId: ORG_ID, projectId: "project_ecommerce", title: "Complete inventory management review", owner: "Toha", priority: "High", status: "In Progress", dueDate: "2026-10-07", context: "First client" },
    { id: "task_photos", organizationId: ORG_ID, projectId: "project_ecommerce", title: "Prepare catalog photography plan", owner: "Ayesha", priority: "Medium", status: "Ready", dueDate: "2026-10-08", context: "First client" },
    { id: "task_video", organizationId: ORG_ID, projectId: "project_brand", title: "Edit founder talking-head video", owner: "Ayesha", priority: "High", status: "In Review", dueDate: "2026-10-04", context: "Brand launch" },
    { id: "task_outreach", organizationId: ORG_ID, title: "Prepare F-commerce outreach list", owner: "Akib", priority: "Medium", status: "Ready", dueDate: "2026-10-09", context: "Sales" },
    { id: "task_assets", organizationId: ORG_ID, projectId: "project_brand", title: "Finish illustration and social asset set", owner: "Tasnuva", priority: "Medium", status: "Blocked", dueDate: "2026-10-07", context: "Waiting for brand copy" },
  ]).onConflictDoNothing();
  await db.insert(leads).values([
    { id: "lead_biology", organizationId: ORG_ID, business: "Biology Boost", contact: "Primary contact", stage: "Identified", owner: "Jarif", source: "Warm network", estimatedValue: 1800000, nextAction: "Confirm discovery call", nextActionDate: "2026-10-05", lastTouch: "2026-10-01" },
    { id: "lead_banker", organizationId: ORG_ID, business: "Banker Portfolio", contact: "Project sponsor", stage: "Demo Scheduled", owner: "Jarif", source: "Warm network", estimatedValue: 800000, nextAction: "Share pricing options", nextActionDate: "2026-10-04", lastTouch: "2026-10-02" },
    { id: "lead_solvix", organizationId: ORG_ID, business: "Solvix", contact: "Founder", stage: "Demo Completed", owner: "Akib", source: "Warm network", estimatedValue: 2200000, nextAction: "Request structured feedback", nextActionDate: "2026-10-04", lastTouch: "2026-09-29" },
    { id: "lead_nno", organizationId: ORG_ID, business: "NNO", contact: "Business contact", stage: "Contacted", owner: "Akib", source: "Warm network", estimatedValue: 1200000, nextAction: "Qualify business need", nextActionDate: "2026-10-06", lastTouch: "2026-10-01" },
    { id: "lead_chajoy", organizationId: ORG_ID, business: "ChaJoy", contact: "Owner", stage: "Identified", owner: "Farid", source: "Warm network", estimatedValue: 1600000, nextAction: "Arrange first conversation", nextActionDate: "2026-10-07", lastTouch: "2026-09-28" },
  ]).onConflictDoNothing();
  await db.insert(contentItems).values([
    { id: "content_intro", organizationId: ORG_ID, title: "Why we are building Protos", platform: "Facebook", format: "Video", pillar: "Build in public", owner: "Ayesha", status: "In Review", publishDate: "2026-10-06" },
    { id: "content_client", organizationId: ORG_ID, title: "How inventory systems help local sellers", platform: "LinkedIn", format: "Carousel", pillar: "Business education", owner: "Tasnuva", status: "Drafting", publishDate: "2026-10-10" },
    { id: "content_ai", organizationId: ORG_ID, title: "Useful AI features for Bangladeshi SMBs", platform: "Facebook", format: "Short video", pillar: "AI education", owner: "Akib", status: "Idea", publishDate: "2026-10-13" },
  ]).onConflictDoNothing();
  await db.insert(financeEntries).values([
    { id: "finance_invoice", organizationId: ORG_ID, kind: "invoice", label: "First client · project advance", category: "Client revenue", amount: 1500000, status: "Invoiced", dueDate: "2026-10-08" },
    { id: "finance_hosting", organizationId: ORG_ID, kind: "expense", label: "Hosting and domains", category: "Infrastructure", amount: 0, status: "Planned", dueDate: "2026-10-31" },
    { id: "finance_ai", organizationId: ORG_ID, kind: "expense", label: "AI tools and API usage", category: "AI tools", amount: 0, status: "Planned", dueDate: "2026-10-31" },
  ]).onConflictDoNothing();
  await db.insert(activityEvents).values([
    { id: "activity_1", organizationId: ORG_ID, actor: "Ayesha", action: "moved founder video to review", entityType: "content", entityId: "content_intro" },
    { id: "activity_2", organizationId: ORG_ID, actor: "Toha", action: "updated project progress to 62%", entityType: "project", entityId: "project_ecommerce" },
    { id: "activity_3", organizationId: ORG_ID, actor: "Akib", action: "scheduled a follow-up with Solvix", entityType: "lead", entityId: "lead_solvix" },
  ]).onConflictDoNothing();
}

export async function updateTaskStatus(id: string, status: string, actor: string) {
  const db = getDb();
  await db.update(tasks).set({ status, updatedAt: new Date().toISOString() }).where(eq(tasks.id, id));
  await db.insert(activityEvents).values({ id: crypto.randomUUID(), organizationId: ORG_ID, actor, action: `moved a task to ${status}`, entityType: "task", entityId: id });
}
export async function updateLeadStage(id: string, stage: string, actor: string) {
  const db = getDb();
  await db.update(leads).set({ stage }).where(eq(leads.id, id));
  await db.insert(activityEvents).values({ id: crypto.randomUUID(), organizationId: ORG_ID, actor, action: `moved a lead to ${stage}`, entityType: "lead", entityId: id });
}
export async function createRecord(input: { type: string; title: string; owner: string }, actor: string) {
  const db = getDb(); const id = crypto.randomUUID();
  if (input.type === "task") await db.insert(tasks).values({ id, organizationId: ORG_ID, title: input.title, owner: input.owner, priority: "Medium", status: "Ready", context: "General" });
  else if (input.type === "lead") await db.insert(leads).values({ id, organizationId: ORG_ID, business: input.title, contact: "To be confirmed", stage: "Identified", owner: input.owner, source: "Direct", nextAction: "Define next action" });
  else if (input.type === "content") await db.insert(contentItems).values({ id, organizationId: ORG_ID, title: input.title, platform: "Facebook", format: "Post", pillar: "Build in public", owner: input.owner, status: "Idea" });
  else throw new Error("Unsupported record type");
  await db.insert(activityEvents).values({ id: crypto.randomUUID(), organizationId: ORG_ID, actor, action: `created ${input.type}: ${input.title}`, entityType: input.type, entityId: id });
  return id;
}
