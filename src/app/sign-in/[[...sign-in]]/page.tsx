import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Terminal } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="auth-page-wrapper">
      {/* Background ambient glow */}
      <div className="auth-ambient-glow-1" />
      <div className="auth-ambient-glow-2" />

      {/* Header bar */}
      <header className="auth-top-bar">
        <Link href="/" className="auth-return-btn">
          <ArrowLeft style={{ width: 14, height: 14 }} />
          <span>RETURN TO HOME</span>
        </Link>
        <div className="auth-brand-badge">
          <Terminal style={{ width: 14, height: 14 }} className="auth-brand-badge-icon" />
          <span>CYBER::AUTH_GATEWAY</span>
        </div>
      </header>

      {/* Auth Card Container */}
      <main className="auth-card-container">
        <SignIn fallbackRedirectUrl="/studio" />
      </main>
    </div>
  );
}



