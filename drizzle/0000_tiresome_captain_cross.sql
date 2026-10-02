CREATE TABLE `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activity_org_created` ON `activity_events` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`title` text NOT NULL,
	`platform` text NOT NULL,
	`format` text NOT NULL,
	`pillar` text NOT NULL,
	`owner` text NOT NULL,
	`status` text NOT NULL,
	`publish_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_content_org_status` ON `content_items` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `finance_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`category` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`due_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_finance_org_kind` ON `finance_entries` (`organization_id`,`kind`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`title` text NOT NULL,
	`owner` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`target` text NOT NULL,
	`signal` text DEFAULT 'on-track' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_goals_org_status` ON `goals` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`business` text NOT NULL,
	`contact` text NOT NULL,
	`stage` text NOT NULL,
	`owner` text NOT NULL,
	`source` text NOT NULL,
	`estimated_value` integer DEFAULT 0 NOT NULL,
	`next_action` text NOT NULL,
	`next_action_date` text,
	`last_touch` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_leads_org_stage` ON `leads` (`organization_id`,`stage`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`auth_user_id` text,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`discipline` text NOT NULL,
	`initials` text NOT NULL,
	`color` text NOT NULL,
	`open_tasks` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_members_org` ON `members` (`organization_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`timezone` text DEFAULT 'Asia/Dhaka' NOT NULL,
	`currency` text DEFAULT 'BDT' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`client` text NOT NULL,
	`lead` text NOT NULL,
	`stage` text NOT NULL,
	`health` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`due_date` text,
	`next_milestone` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_projects_org_stage` ON `projects` (`organization_id`,`stage`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text,
	`title` text NOT NULL,
	`owner` text NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`due_date` text,
	`context` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_org_status` ON `tasks` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_owner` ON `tasks` (`owner`);