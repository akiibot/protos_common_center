import { UserProfile } from "@clerk/nextjs";

export default function SecurityPage() {
  return (
    <main className="security-shell">
      <div className="security-heading">
        <div className="brand-mark brand-mark-large">P</div>
        <div>
          <p className="eyebrow">Protos Common Center</p>
          <h1>Account security</h1>
          <p>Owners and administrators must enable two-step verification before accessing company operations.</p>
        </div>
      </div>
      <UserProfile path="/security" routing="path" />
    </main>
  );
}
