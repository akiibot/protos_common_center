"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeDollarSign, Bell, BookOpen, BriefcaseBusiness, CalendarDays,
  CheckCircle2, ChevronRight, CircleAlert, CircleDot, Command,
  FileText, Goal, LayoutDashboard, Menu, Plus, Search, Sparkles, Target,
  Users, WalletCards, X,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Lead, Task, WorkspaceSnapshot } from "@/lib/types";

type View = "dashboard" | "roadmap" | "sales" | "clients" | "projects" | "tasks" | "content" | "finance" | "team" | "knowledge";
const nav: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Command", icon: LayoutDashboard }, { id: "tasks", label: "My work", icon: CheckCircle2 },
  { id: "roadmap", label: "Roadmap", icon: Goal }, { id: "sales", label: "Sales", icon: Target },
  { id: "clients", label: "Clients", icon: BriefcaseBusiness }, { id: "projects", label: "Projects", icon: Command },
  { id: "content", label: "Content", icon: CalendarDays }, { id: "finance", label: "Finance", icon: WalletCards },
  { id: "team", label: "Team", icon: Users }, { id: "knowledge", label: "Knowledge", icon: BookOpen },
];
const taskStatuses = ["Backlog", "Ready", "In Progress", "In Review", "Blocked", "Done"];
const leadStages = ["Identified", "Contacted", "Qualified", "Demo Scheduled", "Demo Completed", "Proposal Sent", "Won"];

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string;
        title?: string;
        description: string;
        inputSchema: object;
        annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
        execute: (input: unknown) => unknown | Promise<unknown>;
      }, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

export function DashboardClient({ user }: { user: { name: string; email: string } }) {
  const [data, setData] = useState<WorkspaceSnapshot | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [mobileNav, setMobileNav] = useState(false); const [quickOpen, setQuickOpen] = useState(false);
  const [recordType, setRecordType] = useState("task"); const [recordTitle, setRecordTitle] = useState("");
  const [recordOwner, setRecordOwner] = useState("Akib"); const [search, setSearch] = useState("");

  const loadWorkspace = useCallback(async (quiet = false) => {
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      if (!response.ok) throw new Error("workspace unavailable");
      setData(await response.json() as WorkspaceSnapshot);
    } catch (error) {
      console.error("workspace load failed", error);
      if (!quiet) toast.error("The workspace could not be loaded");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadWorkspace(), 0);
    const refresh = window.setInterval(() => void loadWorkspace(true), 15_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(refresh);
    };
  }, [loadWorkspace]);

  useEffect(() => {
    if (!data) return;
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({
        name: "get_protos_workspace_summary",
        title: "Get Protos workspace summary",
        description: "Read the current Protos Common Center counts and pipeline value without changing company data.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({
          openTasks: data.tasks.filter((task) => task.status !== "Done").length,
          blockedTasks: data.tasks.filter((task) => task.status === "Blocked").length,
          activeLeads: data.leads.filter((lead) => !["Won", "Lost"].includes(lead.stage)).length,
          pipelineBdt: data.leads.filter((lead) => !["Won", "Lost"].includes(lead.stage)).reduce((sum, lead) => sum + lead.estimatedValue, 0) / 100,
          activeProjects: data.projects.filter((project) => project.stage === "Active").length,
        }),
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "open_protos_workspace_view",
        title: "Open a Protos workspace view",
        description: "Navigate the visible Common Center interface to a specific company workspace view.",
        inputSchema: { type: "object", properties: { view: { type: "string", enum: nav.map((item) => item.id) } }, required: ["view"], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: (input) => {
          const requested = typeof input === "object" && input !== null && "view" in input ? String((input as { view: unknown }).view) : "";
          if (!nav.some((item) => item.id === requested)) throw new Error("Unknown workspace view");
          setView(requested as View);
          setMobileNav(false);
          return { opened: requested };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch((error) => console.warn("WebMCP registration unavailable", error));
    return () => lifecycle.abort();
  }, [data]);

  if (!data) {
    return (
      <main className="signin-shell">
        <section className="signin-card">
          <div className="brand-mark brand-mark-large">P</div>
          <p className="eyebrow">Protos Common Center</p>
          <h1>Preparing your workspace.</h1>
          <p className="signin-copy">Connecting to the shared company workspace…</p>
        </section>
      </main>
    );
  }

  const openTasks = data.tasks.filter((task) => task.status !== "Done");
  const activeLeads = data.leads.filter((lead) => !["Won", "Lost"].includes(lead.stage));
  const pipeline = activeLeads.reduce((sum, lead) => sum + lead.estimatedValue, 0);
  const attention = [
    ...data.tasks.filter((task) => task.status === "Blocked").map((task) => ({ title: task.title, meta: "Blocked · needs resolution", tone: "danger" })),
    ...data.leads.filter((lead) => lead.nextActionDate && lead.nextActionDate <= "2026-10-04").map((lead) => ({ title: lead.business, meta: `${lead.nextAction} · due now`, tone: "gold" })),
  ];
  const currentLabel = nav.find((item) => item.id === view)?.label ?? "Command";
  const filteredTasks = data.tasks.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()));
  const filteredLeads = data.leads.filter((item) => item.business.toLowerCase().includes(search.toLowerCase()));

  async function mutate(payload: Record<string, string>) {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("save failed");
    return response.json() as Promise<{ ok: true; id?: string }>;
  }

  async function changeTaskStatus(task: Task, status: string) {
    const previous = data?.tasks ?? []; setData((current) => current ? ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, status } : item) }) : current);
    try { await mutate({ action: "task-status", id: task.id, status }); await loadWorkspace(true); toast.success(`Task moved to ${status}`); }
    catch { setData((current) => current ? ({ ...current, tasks: previous }) : current); toast.error("The task could not be updated"); }
  }
  async function changeLeadStage(lead: Lead, stage: string) {
    const previous = data?.leads ?? []; setData((current) => current ? ({ ...current, leads: current.leads.map((item) => item.id === lead.id ? { ...item, stage } : item) }) : current);
    try { await mutate({ action: "lead-stage", id: lead.id, stage }); await loadWorkspace(true); toast.success(`${lead.business} moved to ${stage}`); }
    catch { setData((current) => current ? ({ ...current, leads: previous }) : current); toast.error("The lead could not be updated"); }
  }
  async function createQuickRecord() {
    if (!recordTitle.trim()) return;
    try {
      if (!["task", "lead", "content"].includes(recordType)) throw new Error("unsupported record type");
      await mutate({ action: "create", type: recordType, title: recordTitle.trim(), owner: recordOwner });
      await loadWorkspace(true);
      setQuickOpen(false); setRecordTitle(""); toast.success("New record created");
    } catch { toast.error("The record could not be created"); }
  }

  const views: Record<View, React.ReactNode> = {
    dashboard: <CommandView data={data} openTasks={openTasks} activeLeads={activeLeads} pipeline={pipeline} attention={attention} onView={setView} />,
    roadmap: <RoadmapView data={data} />, sales: <SalesView leads={filteredLeads} onStage={changeLeadStage} />,
    clients: <ClientsView />, projects: <ProjectsView data={data} />, tasks: <TasksView tasks={filteredTasks} onStatus={changeTaskStatus} />,
    content: <ContentView data={data} />, finance: <FinanceView data={data} />, team: <TeamView data={data} />, knowledge: <KnowledgeView />,
  };
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><div className="brand-mark">P</div><div><strong>Protos</strong><span>Common Center</span></div><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X /></button></div>
      <nav aria-label="Main navigation"><p className="nav-label">Operate</p>{nav.slice(0, 6).map((item) => <NavItem key={item.id} item={item} active={view === item.id} onClick={() => { setView(item.id); setMobileNav(false); }} />)}<p className="nav-label nav-label-spaced">Company</p>{nav.slice(6).map((item) => <NavItem key={item.id} item={item} active={view === item.id} onClick={() => { setView(item.id); setMobileNav(false); }} />)}</nav>
      <div className="phase-card"><div className="phase-top"><span>Phase 1</span><strong>36%</strong></div><Progress value={36} /><p>Foundation · BDT 50K target</p></div>
      <div className="profile-chip"><span className="avatar">{initials(user.name)}</span><div><strong>{shortName(user.name)}</strong><span>Founder workspace</span></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></button><div><p className="breadcrumb">Protos / {currentLabel}</p><h1>{currentLabel}</h1></div><div className="topbar-actions"><label className="searchbox"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workspace" /><kbd>⌘ K</kbd></label><button className="icon-button" aria-label="Notifications"><Bell /><span className="notification-dot" /></button><Button onClick={() => setQuickOpen(true)} className="quick-button"><Plus />Create</Button></div></header>
      <section className="workspace">{views[view]}</section>
    </main>
    <Dialog open={quickOpen} onOpenChange={setQuickOpen}><DialogContent className="quick-dialog"><DialogHeader><DialogTitle>Create a record</DialogTitle><DialogDescription>Add a task, lead, or content idea without leaving your current view.</DialogDescription></DialogHeader><div className="dialog-fields"><label><span>Type</span><Select value={recordType} onValueChange={setRecordType}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="task">Task</SelectItem><SelectItem value="lead">Lead</SelectItem><SelectItem value="content">Content idea</SelectItem></SelectContent></Select></label><label><span>Name</span><Input value={recordTitle} onChange={(event) => setRecordTitle(event.target.value)} placeholder={recordType === "lead" ? "Business name" : "Clear, actionable title"} /></label><label><span>Owner</span><Select value={recordOwner} onValueChange={setRecordOwner}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{data.members.map((member) => <SelectItem value={member.name} key={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></label></div><DialogFooter><Button variant="outline" onClick={() => setQuickOpen(false)}>Cancel</Button><Button onClick={createQuickRecord} disabled={!recordTitle.trim()}>Create record</Button></DialogFooter></DialogContent></Dialog>
    <Toaster richColors position="bottom-right" />
  </div>;
}

function NavItem({ item, active, onClick }: { item: { id: View; label: string; icon: typeof LayoutDashboard }; active: boolean; onClick: () => void }) { const Icon = item.icon; return <button className={`nav-item ${active ? "nav-item-active" : ""}`} onClick={onClick}><Icon /><span>{item.label}</span>{active && <span className="active-rule" />}</button>; }

function CommandView({ data, openTasks, activeLeads, pipeline, attention, onView }: { data: WorkspaceSnapshot; openTasks: Task[]; activeLeads: Lead[]; pipeline: number; attention: Array<{ title: string; meta: string; tone: string }>; onView: (view: View) => void }) {
  const inProgress = data.tasks.filter((task) => task.status === "In Progress").length; const review = data.tasks.filter((task) => task.status === "In Review").length;
  return <><div className="welcome-row"><div><p className="eyebrow">Saturday · 3 October</p><h2>Good evening, Akib.</h2><p>Here is what needs the company’s attention.</p></div><div className="focus-chip"><Sparkles /><span><strong>Today’s focus</strong>Move Solvix forward and unblock brand assets.</span></div></div>
    <div className="metric-grid"><Metric label="Open pipeline" value={money(pipeline)} detail={`${activeLeads.length} active opportunities`} tone="teal" onClick={() => onView("sales")} /><Metric label="Active projects" value={String(data.projects.filter((p) => p.stage === "Active").length)} detail="1 needs attention" tone="ink" onClick={() => onView("projects")} /><Metric label="Work in motion" value={String(inProgress + review)} detail={`${inProgress} active · ${review} in review`} tone="gold" onClick={() => onView("tasks")} /><Metric label="Cash received" value="BDT 0" detail="BDT 15K currently invoiced" tone="plain" onClick={() => onView("finance")} /></div>
    <div className="dashboard-grid"><section className="panel panel-large"><PanelHeader eyebrow="Execution" title="Work in motion" action="View all tasks" onClick={() => onView("tasks")} /><div className="task-stack">{openTasks.slice(0, 5).map((task) => <div className="task-row" key={task.id}><span className={`status-marker status-${slug(task.status)}`} /><div className="task-copy"><strong>{task.title}</strong><span>{task.context} · {task.owner}</span></div><span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span><time>{formatDate(task.dueDate)}</time></div>)}</div></section>
      <section className="panel attention-panel"><PanelHeader eyebrow="Attention" title={`${attention.length} decisions or risks`} /><div className="attention-stack">{attention.map((item, index) => <button key={`${item.title}-${index}`} className="attention-item"><span className={`attention-icon ${item.tone}`}><CircleAlert /></span><span><strong>{item.title}</strong><small>{item.meta}</small></span><ChevronRight /></button>)}</div><button className="ai-brief"><Sparkles /><span><strong>Prepare weekly brief</strong><small>Summarize movement, risks and decisions.</small></span></button></section>
      <section className="panel"><PanelHeader eyebrow="Strategy" title="Phase 1 progress" action="Open roadmap" onClick={() => onView("roadmap")} /><div className="goal-list">{data.goals.map((goal) => <div key={goal.id} className="goal-row"><div><strong>{goal.title}</strong><span>{goal.owner} · {goal.target}</span></div><div className="goal-progress"><span>{goal.progress}%</span><Progress value={goal.progress} /></div></div>)}</div></section>
      <section className="panel"><PanelHeader eyebrow="Sales" title="Pipeline movement" action="Open pipeline" onClick={() => onView("sales")} /><div className="pipeline-list">{["Identified", "Contacted", "Demo Scheduled", "Demo Completed", "Proposal Sent"].map((stage) => { const items = data.leads.filter((lead) => lead.stage === stage); return <div key={stage}><span>{stage}</span><div className="pipeline-track"><i style={{ width: `${Math.max(4, items.length * 27)}%` }} /></div><strong>{items.length}</strong></div>; })}</div></section>
      <section className="panel activity-panel"><PanelHeader eyebrow="Company" title="Recent movement" /><div className="activity-list">{data.activity.map((event) => <div key={event.id}><span className="activity-avatar">{initials(event.actor)}</span><p><strong>{event.actor}</strong> {event.action}<small>{relativeTime(event.createdAt)}</small></p></div>)}</div></section></div></>;
}

function RoadmapView({ data }: { data: WorkspaceSnapshot }) { return <PageFrame eyebrow="Company direction" title="Phase 1 · The Foundation" description="Connect every strategic target to owners, projects and measurable outcomes."><div className="roadmap-list">{data.goals.map((goal, index) => <article className="roadmap-card" key={goal.id}><span className="roadmap-number">0{index + 1}</span><div className="roadmap-copy"><div className="row-between"><span className={`health health-${goal.signal}`}>{goal.signal.replace("-", " ")}</span><strong>{goal.progress}%</strong></div><h3>{goal.title}</h3><p>{goal.target}</p><Progress value={goal.progress} /><footer><span>Owner · {goal.owner}</span><span>{goal.status}</span></footer></div></article>)}</div></PageFrame>; }
function SalesView({ leads, onStage }: { leads: Lead[]; onStage: (lead: Lead, stage: string) => void }) { return <PageFrame eyebrow="Revenue engine" title="Sales pipeline" description="Every active opportunity needs an owner, a clear next action and a date."><div className="pipeline-board">{leadStages.slice(0, 6).map((stage) => { const stageLeads = leads.filter((lead) => lead.stage === stage); return <section className="pipeline-column" key={stage}><header><span>{stage}</span><b>{stageLeads.length}</b></header><p className="column-value">{money(stageLeads.reduce((sum, lead) => sum + lead.estimatedValue, 0))}</p>{stageLeads.map((lead) => <article className="lead-card" key={lead.id}><div className="row-between"><span className="lead-source">{lead.source}</span><span className="mini-avatar">{initials(lead.owner)}</span></div><h3>{lead.business}</h3><p>{lead.nextAction}</p><div className="lead-value">{money(lead.estimatedValue)}</div><Select value={lead.stage} onValueChange={(value) => onStage(lead, value)}><SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{leadStages.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></article>)}</section>; })}</div></PageFrame>; }
function ClientsView() { return <PageFrame eyebrow="Relationships" title="Clients" description="Client context, delivery, money and communication stay in one record."><div className="empty-client"><BriefcaseBusiness /><div><h3>No signed clients yet</h3><p>When an opportunity is marked Won, Common Center will create the client and project without duplicate entry.</p><Button variant="outline">Review conversion checklist</Button></div></div><h3 className="section-heading">Conversion preview</h3><div className="conversion-flow"><span>Won lead</span><ChevronRight /><span>Client</span><ChevronRight /><span>Project</span><ChevronRight /><span>Advance invoice</span><ChevronRight /><span>Onboarding</span></div></PageFrame>; }
function ProjectsView({ data }: { data: WorkspaceSnapshot }) { return <PageFrame eyebrow="Delivery" title="Projects" description="Track scope, milestones, health and financial context together."><div className="project-grid">{data.projects.map((project) => <article className="project-card" key={project.id}><header><span className={`health health-${slug(project.health)}`}>{project.health}</span><span>{project.stage}</span></header><h3>{project.name}</h3><p>{project.client}</p><div className="project-meta"><span><small>Lead</small>{project.lead}</span><span><small>Due</small>{formatDate(project.dueDate)}</span><span><small>Value</small>{project.value ? money(project.value) : "Internal"}</span></div><div className="project-progress"><div className="row-between"><span>Progress</span><strong>{project.progress}%</strong></div><Progress value={project.progress} /></div><footer><CircleDot />Next: {project.nextMilestone}</footer></article>)}</div></PageFrame>; }
function TasksView({ tasks, onStatus }: { tasks: Task[]; onStatus: (task: Task, status: string) => void }) { return <PageFrame eyebrow="Execution" title="My work" description="One accountable owner, one current state and one next commitment."><div className="table-shell"><table><thead><tr><th>Task</th><th>Owner</th><th>Context</th><th>Priority</th><th>Due</th><th>Status</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td><strong>{task.title}</strong></td><td>{task.owner}</td><td>{task.context}</td><td><span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span></td><td>{formatDate(task.dueDate)}</td><td><Select value={task.status} onValueChange={(value) => onStatus(task, value)}><SelectTrigger size="sm"><SelectValue /></SelectTrigger><SelectContent>{taskStatuses.map((status) => <SelectItem value={status} key={status}>{status}</SelectItem>)}</SelectContent></Select></td></tr>)}</tbody></table></div></PageFrame>; }
function ContentView({ data }: { data: WorkspaceSnapshot }) { const statuses = ["Idea", "Drafting", "In Review", "Ready", "Scheduled", "Published"]; return <PageFrame eyebrow="Build in public" title="Content studio" description="Turn company work into useful stories for a Bangladeshi business audience."><div className="content-board">{statuses.map((status) => <section key={status}><header>{status}<b>{data.content.filter((item) => item.status === status).length}</b></header>{data.content.filter((item) => item.status === status).map((item) => <article key={item.id}><span>{item.pillar}</span><h3>{item.title}</h3><p>{item.platform} · {item.format}</p><footer><span className="mini-avatar">{initials(item.owner)}</span><time>{formatDate(item.publishDate)}</time></footer></article>)}</section>)}</div></PageFrame>; }
function FinanceView({ data }: { data: WorkspaceSnapshot }) { const invoiced = data.finance.filter((item) => item.kind === "invoice").reduce((sum, item) => sum + item.amount, 0); const expenses = data.finance.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0); return <PageFrame eyebrow="Financial control" title="Finance" description="Separate committed revenue, invoiced revenue and cash actually received."><div className="finance-summary"><Metric label="Cash received" value="BDT 0" detail="No payments recorded" tone="ink" /><Metric label="Outstanding" value={money(invoiced)} detail="1 invoice open" tone="gold" /><Metric label="Monthly expenses" value={money(expenses)} detail="Replace planned zeros with actuals" tone="plain" /><Metric label="Project margin" value="—" detail="Available after cost entries" tone="teal" /></div><section className="panel finance-panel"><PanelHeader eyebrow="Ledger" title="Current commitments" /><div className="finance-rows">{data.finance.map((entry) => <div key={entry.id}><span className={`finance-icon ${entry.kind}`}><BadgeDollarSign /></span><div><strong>{entry.label}</strong><small>{entry.category} · due {formatDate(entry.dueDate)}</small></div><span className={`health health-${slug(entry.status)}`}>{entry.status}</span><b>{money(entry.amount)}</b></div>)}</div></section></PageFrame>; }
function TeamView({ data }: { data: WorkspaceSnapshot }) { return <PageFrame eyebrow="People" title="Team and capacity" description="Plan around skills, ownership and real availability—not surveillance."><div className="team-grid">{data.members.map((member) => <article key={member.id}><span className="avatar avatar-large" style={{ background: member.color }}>{member.initials}</span><h3>{member.name}</h3><p>{member.role}</p><small>{member.discipline}</small><footer><span>{member.openTasks} open tasks</span><button>View work</button></footer></article>)}</div></PageFrame>; }
function KnowledgeView() { const docs = [{ t: "Client agreement template", c: "Operations", s: "Needs review" }, { t: "Warm outreach playbook", c: "Sales", s: "Current" }, { t: "Protos brand foundations", c: "Brand", s: "Current" }, { t: "Project delivery checklist", c: "Delivery", s: "Draft" }]; return <PageFrame eyebrow="Company memory" title="Knowledge" description="Keep operating procedures, decisions and reusable templates close to the work."><div className="knowledge-grid">{docs.map((doc) => <article key={doc.t}><FileText /><div><span>{doc.c}</span><h3>{doc.t}</h3><p>{doc.s}</p></div><ChevronRight /></article>)}</div></PageFrame>; }
function PageFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) { return <><div className="page-intro"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>{children}</>; }
function Metric({ label, value, detail, tone = "plain", onClick }: { label: string; value: string; detail: string; tone?: string; onClick?: () => void }) { return <button className={`metric-card metric-${tone}`} onClick={onClick}><span>{label}</span><strong>{value}</strong><small>{detail}</small>{onClick && <ChevronRight />}</button>; }
function PanelHeader({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) { return <header className="panel-header"><div><span>{eyebrow}</span><h3>{title}</h3></div>{action && <button onClick={onClick}>{action}<ChevronRight /></button>}</header>; }
function money(value: number) { return `BDT ${(value / 100).toLocaleString("en-US")}`; }
function formatDate(value: string | null) { if (!value) return "No date"; return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${value}T00:00:00`)); }
function initials(value: string) { return value.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }
function shortName(value: string) { return value.includes("@") ? value.split("@")[0] : value.split(" ")[0]; }
function slug(value: string) { return value.toLowerCase().replace(/\s+/g, "-"); }
function relativeTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Recently" : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date); }
