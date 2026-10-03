import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="signin-shell">
      <section className="signin-card">
        <div className="brand-mark brand-mark-large">P</div>
        <p className="eyebrow">Protos Common Center</p>
        <h1>Sign in to your workspace.</h1>
        <p className="signin-copy">Use your invited Protos team account to continue.</p>
        <SignIn routing="path" path="/sign-in" forceRedirectUrl="/" />
      </section>
    </main>
  );
}
