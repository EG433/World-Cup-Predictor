import Link from "next/link";

import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <p className="eyebrow">New player setup</p>
        <h1>Create your account and pick one team to support</h1>
        <p className="muted-text">
          Create a username and password, then choose one national team to support.
        </p>

        <SignupForm />

        <p className="muted-text">
          Already have an account?{" "}
          <Link href="/login" className="inline-link">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
