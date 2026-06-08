"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CreateGroupForm() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [groupPassword, setGroupPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleFinish() {
    const trimmedName = groupName.trim();
    setError("");
    setStatusMessage("");

    if (!trimmedName) {
      setError("Group name is required.");
      return;
    }

    if (privacy === "private" && !groupPassword.trim()) {
      setError("Private groups need a password.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          scoringMode: "traditional",
          privacy,
          password: privacy === "private" ? groupPassword : undefined,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        group?: { id: string };
      };

      if (!response.ok || !data.group) {
        throw new Error(data.error ?? "Could not create group.");
      }

      setStatusMessage("Group created.");
      router.push("/groups");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not create group.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="create-group-form">
      <div className="create-group-header">
        <h1>Create group</h1>
      </div>

      <div className="create-form-row">
        <label htmlFor="group-name">
          <span>Edit group name</span>
          <small>18 characters max</small>
        </label>
        <input
          id="group-name"
          type="text"
          maxLength={18}
          placeholder="Create Group Name"
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
          required
        />
      </div>

      <div className="create-form-row">
        <div>
          <span>Group privacy</span>
          <small>Private groups require a password to join</small>
        </div>
        <div className="create-radio-row" role="radiogroup" aria-label="Group privacy">
          <label>
            <input
              type="radio"
              name="privacy"
              checked={privacy === "public"}
              onChange={() => setPrivacy("public")}
            />
            Public
          </label>
          <label>
            <input
              type="radio"
              name="privacy"
              checked={privacy === "private"}
              onChange={() => setPrivacy("private")}
            />
            Private
          </label>
        </div>
      </div>

      {privacy === "private" ? (
        <div className="create-form-row">
          <label htmlFor="group-password">
            <span>Group password</span>
            <small>Players need this password to join</small>
          </label>
          <input
            id="group-password"
            type="password"
            placeholder="Create group password"
            value={groupPassword}
            onChange={(event) => setGroupPassword(event.target.value)}
          />
        </div>
      ) : null}

      <div className="create-form-actions">
        <Link href="/groups" className="secondary-button">
          Cancel
        </Link>
        <button type="button" className="primary-button" onClick={handleFinish} disabled={isSaving}>
          {isSaving ? "Creating..." : "Finish"}
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {statusMessage ? <p className="form-success">{statusMessage}</p> : null}
    </form>
  );
}
