"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: identifier,
        password: String(formData.get("password") ?? ""),
      }),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Could not log in.");
      return;
    }

    window.dispatchEvent(new Event("auth-change"));
    router.push("/groups");
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Username
        <input
          type="text"
          name="identifier"
          placeholder="Enter your username"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />
      </label>
      <button type="submit" className="primary-button">
        Log in
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
