"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AuthActions() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function syncUser() {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        user: { username: string; supportedTeamId: string } | null;
      };
      setUsername(data.user?.username ?? null);
    }

    void syncUser();
    window.addEventListener("auth-change", syncUser);

    return () => {
      window.removeEventListener("auth-change", syncUser);
    };
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUsername(null);
    window.dispatchEvent(new Event("auth-change"));
  }

  if (username) {
    return (
      <div className="user-pill">
        <span className="user-pill-label">Signed in as</span>
        <strong>{username}</strong>
        <button type="button" className="text-button" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="auth-nav-actions">
      <Link href="/login" className="secondary-button">
        Log in
      </Link>
      <Link href="/signup" className="primary-button">
        Sign up
      </Link>
    </div>
  );
}
