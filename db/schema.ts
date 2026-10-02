import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  timezone: text("timezone").notNull().default("Asia/Dhaka"),
  currency: text("currency").notNull().default("BDT"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const members = sqliteTable("members", {
  id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), authUserId: text("auth_user_id"),
  name: text("name").notNull(), role: text("role").notNull(), discipline: text("discipline").notNull(),
  initials: text("initials").notNull(), color: text("color").notNull(), openTasks: integer("open_tasks").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_members_org").on(table.organizationId)]);

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), title: text("title").notNull(),
  owner: text("owner").notNull(), status: text("status").notNull(), progress: integer("progress").notNull().default(0),
  target: text("target").notNull(), signal: text("signal").notNull().default("on-track"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_goals_org_status").on(table.organizationId, table.status)]);

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), name: text("name").notNull(),
  client: text("client").notNull(), lead: text("lead").notNull(), stage: text("stage").notNull(), health: text("health").notNull(),
  progress: integer("progress").notNull().default(0), value: integer("value").notNull().default(0), dueDate: text("due_date"),
  nextMilestone: text("next_milestone").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_projects_org_stage").on(table.organizationId, table.stage)]);

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), projectId: text("project_id"),
  title: text("title").notNull(), owner: text("owner").notNull(), priority: text("priority").notNull(),
  status: text("status").notNull(), dueDate: text("due_date"), context: text("context").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_tasks_org_status").on(table.organizationId, table.status), index("idx_tasks_owner").on(table.owner)]);

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), business: text("business").notNull(),
  contact: text("contact").notNull(), stage: text("stage").notNull(), owner: text("owner").notNull(), source: text("source").notNull(),
  estimatedValue: integer("estimated_value").notNull().default(0), nextAction: text("next_action").notNull(),
  nextActionDate: text("next_action_date"), lastTouch: text("last_touch"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_leads_org_stage").on(table.organizationId, table.stage)]);

export const contentItems = sqliteTable("content_items", {
  id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), title: text("title").notNull(),
  platform: text("platform").notNull(), format: text("format").notNull(), pillar: text("pillar").notNull(),
  owner: text("owner").notNull(), status: text("status").notNull(), publishDate: text("publish_date"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_content_org_status").on(table.organizationId, table.status)]);

export const financeEntries = sqliteTable("finance_entries", {
  id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), kind: text("kind").notNull(),
  label: text("label").notNull(), category: text("category").notNull(), amount: integer("amount").notNull().default(0),
  status: text("status").notNull(), dueDate: text("due_date"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_finance_org_kind").on(table.organizationId, table.kind)]);

export const activityEvents = sqliteTable("activity_events", {
  id: text("id").primaryKey(), organizationId: text("organization_id").notNull(), actor: text("actor").notNull(),
  action: text("action").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_activity_org_created").on(table.organizationId, table.createdAt)]);
