const createdAt = "2026-10-02T21:47:02.000Z";

export const seedData = {
  organization: {
    id: "org_protos",
    name: "Protos",
    slug: "protos",
    timezone: "Asia/Dhaka",
    currency: "BDT",
    createdAt,
  },
  members: [
    { id: "member_akib", organizationId: "org_protos", authUserId: "protos-shared-workspace", name: "Akib", role: "Founder", discipline: "Strategy · AI · Business", initials: "AK", color: "#2C8C7B", openTasks: 2, createdAt },
    { id: "member_farid", organizationId: "org_protos", authUserId: null, name: "Farid", role: "Creative Developer", discipline: "Web · Graphics · Video", initials: "FK", color: "#D8A246", openTasks: 1, createdAt },
    { id: "member_wasik", organizationId: "org_protos", authUserId: null, name: "Wasik", role: "Product Designer", discipline: "UI/UX · Graphics", initials: "WZ", color: "#6879C8", openTasks: 0, createdAt },
    { id: "member_toha", organizationId: "org_protos", authUserId: null, name: "Toha", role: "AI Developer", discipline: "Web · ML · AI", initials: "TN", color: "#4B9C63", openTasks: 1, createdAt },
    { id: "member_ayesha", organizationId: "org_protos", authUserId: null, name: "Ayesha", role: "Content Lead", discipline: "Photo · Video · Social", initials: "AS", color: "#C76586", openTasks: 2, createdAt },
    { id: "member_tasnuva", organizationId: "org_protos", authUserId: null, name: "Tasnuva", role: "Visual Artist", discipline: "Illustration · Brand", initials: "TW", color: "#8C6AC4", openTasks: 1, createdAt },
    { id: "member_jarif", organizationId: "org_protos", authUserId: null, name: "Jarif", role: "Operations Lead", discipline: "Planning · Coordination", initials: "JK", color: "#477C91", openTasks: 2, createdAt },
  ],
  goals: [
    { id: "goal_revenue", organizationId: "org_protos", title: "Build repeatable service revenue", owner: "Akib", status: "In Progress", progress: 36, target: "BDT 50,000 committed work", signal: "attention", createdAt },
    { id: "goal_brand", organizationId: "org_protos", title: "Establish a recognizable public brand", owner: "Ayesha", status: "In Progress", progress: 24, target: "Consistent weekly publishing", signal: "at-risk", createdAt },
    { id: "goal_delivery", organizationId: "org_protos", title: "Create a reliable delivery system", owner: "Jarif", status: "In Progress", progress: 48, target: "Reusable client workflow", signal: "on-track", createdAt },
  ],
  projects: [
    { id: "project_ecommerce", organizationId: "org_protos", name: "E-commerce + inventory platform", client: "First client", lead: "Toha", stage: "Active", health: "On track", progress: 62, value: 1500000, dueDate: "2026-10-18", nextMilestone: "Catalog and inventory review", createdAt },
    { id: "project_brand", organizationId: "org_protos", name: "Protos brand launch", client: "Internal", lead: "Ayesha", stage: "Active", health: "Needs attention", progress: 31, value: 0, dueDate: "2026-10-12", nextMilestone: "Publish first founder story", createdAt },
    { id: "project_demo", organizationId: "org_protos", name: "AI service demo collection", client: "Internal", lead: "Farid", stage: "Planning", health: "On track", progress: 18, value: 0, dueDate: "2026-10-28", nextMilestone: "Select three demo verticals", createdAt },
  ],
  tasks: [
    { id: "task_agreement", organizationId: "org_protos", projectId: null, title: "Finalize client agreement template", owner: "Farid", priority: "High", status: "In Progress", dueDate: "2026-10-05", context: "Operations", createdAt, updatedAt: createdAt },
    { id: "task_leads", organizationId: "org_protos", projectId: null, title: "Complete warm-network follow-up batch", owner: "Jarif", priority: "High", status: "Ready", dueDate: "2026-10-06", context: "Sales", createdAt, updatedAt: createdAt },
    { id: "task_delivery", organizationId: "org_protos", projectId: "project_ecommerce", title: "Complete inventory management review", owner: "Toha", priority: "High", status: "In Progress", dueDate: "2026-10-07", context: "First client", createdAt, updatedAt: createdAt },
    { id: "task_photos", organizationId: "org_protos", projectId: "project_ecommerce", title: "Prepare catalog photography plan", owner: "Ayesha", priority: "Medium", status: "Ready", dueDate: "2026-10-08", context: "First client", createdAt, updatedAt: createdAt },
    { id: "task_video", organizationId: "org_protos", projectId: "project_brand", title: "Edit founder talking-head video", owner: "Ayesha", priority: "High", status: "In Review", dueDate: "2026-10-04", context: "Brand launch", createdAt, updatedAt: createdAt },
    { id: "task_outreach", organizationId: "org_protos", projectId: null, title: "Prepare F-commerce outreach list", owner: "Akib", priority: "Medium", status: "Ready", dueDate: "2026-10-09", context: "Sales", createdAt, updatedAt: createdAt },
    { id: "task_assets", organizationId: "org_protos", projectId: "project_brand", title: "Finish illustration and social asset set", owner: "Tasnuva", priority: "Medium", status: "Blocked", dueDate: "2026-10-07", context: "Waiting for brand copy", createdAt, updatedAt: createdAt },
  ],
  leads: [
    { id: "lead_biology", organizationId: "org_protos", business: "Biology Boost", contact: "Primary contact", stage: "Identified", owner: "Jarif", source: "Warm network", estimatedValue: 1800000, nextAction: "Confirm discovery call", nextActionDate: "2026-10-05", lastTouch: "2026-10-01", createdAt },
    { id: "lead_banker", organizationId: "org_protos", business: "Banker Portfolio", contact: "Project sponsor", stage: "Demo Scheduled", owner: "Jarif", source: "Warm network", estimatedValue: 800000, nextAction: "Share pricing options", nextActionDate: "2026-10-04", lastTouch: "2026-10-02", createdAt },
    { id: "lead_solvix", organizationId: "org_protos", business: "Solvix", contact: "Founder", stage: "Demo Completed", owner: "Akib", source: "Warm network", estimatedValue: 2200000, nextAction: "Request structured feedback", nextActionDate: "2026-10-04", lastTouch: "2026-09-29", createdAt },
    { id: "lead_nno", organizationId: "org_protos", business: "NNO", contact: "Business contact", stage: "Contacted", owner: "Akib", source: "Warm network", estimatedValue: 1200000, nextAction: "Qualify business need", nextActionDate: "2026-10-06", lastTouch: "2026-10-01", createdAt },
    { id: "lead_chajoy", organizationId: "org_protos", business: "ChaJoy", contact: "Owner", stage: "Identified", owner: "Farid", source: "Warm network", estimatedValue: 1600000, nextAction: "Arrange first conversation", nextActionDate: "2026-10-07", lastTouch: "2026-09-28", createdAt },
  ],
  contentItems: [
    { id: "content_intro", organizationId: "org_protos", title: "Why we are building Protos", platform: "Facebook", format: "Video", pillar: "Build in public", owner: "Ayesha", status: "In Review", publishDate: "2026-10-06", createdAt },
    { id: "content_client", organizationId: "org_protos", title: "How inventory systems help local sellers", platform: "LinkedIn", format: "Carousel", pillar: "Business education", owner: "Tasnuva", status: "Drafting", publishDate: "2026-10-10", createdAt },
    { id: "content_ai", organizationId: "org_protos", title: "Useful AI features for Bangladeshi SMBs", platform: "Facebook", format: "Short video", pillar: "AI education", owner: "Akib", status: "Idea", publishDate: "2026-10-13", createdAt },
  ],
  financeEntries: [
    { id: "finance_invoice", organizationId: "org_protos", kind: "invoice", label: "First client · project advance", category: "Client revenue", amount: 1500000, status: "Invoiced", dueDate: "2026-10-08", createdAt },
    { id: "finance_hosting", organizationId: "org_protos", kind: "expense", label: "Hosting and domains", category: "Infrastructure", amount: 0, status: "Planned", dueDate: "2026-10-31", createdAt },
    { id: "finance_ai", organizationId: "org_protos", kind: "expense", label: "AI tools and API usage", category: "AI tools", amount: 0, status: "Planned", dueDate: "2026-10-31", createdAt },
  ],
  activityEvents: [
    { id: "activity_1", organizationId: "org_protos", actor: "Ayesha", action: "moved founder video to review", entityType: "content", entityId: "content_intro", createdAt },
    { id: "activity_2", organizationId: "org_protos", actor: "Toha", action: "updated project progress to 62%", entityType: "project", entityId: "project_ecommerce", createdAt },
    { id: "activity_3", organizationId: "org_protos", actor: "Akib", action: "scheduled a follow-up with Solvix", entityType: "lead", entityId: "lead_solvix", createdAt },
  ],
};
