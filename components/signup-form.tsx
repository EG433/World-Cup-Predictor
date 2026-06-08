"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { teams } from "@/lib/mock-data";

export function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password: String(formData.get("password") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
        supportedTeamId: String(formData.get("supportedTeamId") ?? ""),
      }),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Could not create account.");
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
          name="username"
          placeholder="Choose a username"
          autoComplete="username"
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_]+"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          placeholder="Create a password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm your password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </label>
      <label>
        Supported national team
        <select name="supportedTeamId" defaultValue="" required>
          <option value="" disabled>
            Select one team
          </option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} ({team.code})
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="primary-button">
        Create account
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
