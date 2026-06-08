import { NextResponse } from "next/server";

import { createSession, getSessionCookieOptions, loginUser, sessionCookieName } from "@/lib/server-auth";
import { reconcileUserGroupMemberships } from "@/lib/server-groups";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    const user = await loginUser({
      username: body.username ?? "",
      password: body.password ?? "",
    });
    await reconcileUserGroupMemberships(user);
    const sessionToken = await createSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set(sessionCookieName, sessionToken, getSessionCookieOptions());

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not log in." },
      { status: 401 },
    );
  }
}
