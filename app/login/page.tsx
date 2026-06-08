import Link from "next/link";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <p className="eyebrow">Account access</p>
        <h1>Log in to your prediction account</h1>
        <p className="muted-text">
          Use your username and password. Passwords should be verified by a secure auth provider,
          never stored in browser storage.
        </p>

        <LoginForm />

        <p className="muted-text">
          New here?{" "}
          <Link href="/signup" className="inline-link">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
