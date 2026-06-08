import { NextResponse } from "next/server";

import { createSession, createUser, getSessionCookieOptions, sessionCookieName } from "@/lib/server-auth";
import { reconcileUserGroupMemberships } from "@/lib/server-groups";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      confirmPassword?: string;
      supportedTeamId?: string;
    };

    if (body.password !== body.confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const user = await createUser({
      username: body.username ?? "",
      password: body.password ?? "",
      supportedTeamId: body.supportedTeamId ?? "",
    });
    await reconcileUserGroupMemberships(user);
    const sessionToken = await createSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set(sessionCookieName, sessionToken, getSessionCookieOptions());

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create account." },
      { status: 400 },
    );
  }
}
