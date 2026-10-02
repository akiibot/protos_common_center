import { DashboardClient } from "@/app/dashboard-client";
import { getWorkspaceSnapshot } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = { userId: "protos-shared-workspace", displayName: "Akib", email: "" };

  try {
    const snapshot = await getWorkspaceSnapshot(user);
    return <DashboardClient initial={snapshot} user={{ name: user.displayName, email: user.email }} />;
  } catch (error) {
    console.error("workspace unavailable", error);
    return (
      <main className="signin-shell">
        <section className="signin-card">
          <div className="brand-mark brand-mark-large">P</div>
          <p className="eyebrow">Protos Common Center</p>
          <h1>The workspace is being prepared.</h1>
          <p className="signin-copy">Your data could not be loaded yet. Refresh shortly; your input has not been changed.</p>
        </section>
      </main>
    );
  }
}
