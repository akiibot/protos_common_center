import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { DashboardClient } from "@/app/dashboard-client";
import { getWorkspaceSnapshot } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  if (!user) {
    return (
      <main className="signin-shell">
        <section className="signin-card">
          <div className="brand-mark brand-mark-large">P</div>
          <p className="eyebrow">Protos internal workspace</p>
          <h1>One place to move the company forward.</h1>
          <p className="signin-copy">Strategy, sales, projects, content and finance—connected around the work that needs attention.</p>
          <a className="signin-button" href={chatGPTSignInPath("/")} target="_top">Sign in with ChatGPT</a>
          <p className="signin-note">Private access · Asia/Dhaka · BDT</p>
        </section>
      </main>
    );
  }

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
