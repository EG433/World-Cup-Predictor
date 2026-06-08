import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { joinPredictionGroupByName } from "@/lib/server-groups";
import {
  createGuestUser,
  createSession,
  getSessionCookieOptions,
  getUserFromSession,
  sessionCookieName,
} from "@/lib/server-auth";

async function getSignedInUser() {
  const cookieStore = await cookies();
  return getUserFromSession(cookieStore.get(sessionCookieName)?.value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      routeGroupId?: string;
      password?: string;
      username?: string;
      supportedTeamId?: string;
    };
    let user = await getSignedInUser();
    let sessionToken: string | null = null;

    if (!user) {
      if (!body.username?.trim()) {
        return NextResponse.json({ error: "Enter a username to join a group." }, { status: 400 });
      }

      if (!body.supportedTeamId?.trim()) {
        return NextResponse.json(
          { error: "Choose a national team before joining a group." },
          { status: 400 },
        );
      }

      user = await createGuestUser({
        username: body.username,
        supportedTeamId: body.supportedTeamId,
      });
      sessionToken = await createSession(user.id);
    }

    const result = await joinPredictionGroupByName({
      name: body.name ?? "",
      password: body.password,
      user,
      routeGroupId: body.routeGroupId,
    });
    const response = NextResponse.json(result);

    if (sessionToken) {
      response.cookies.set(sessionCookieName, sessionToken, getSessionCookieOptions());
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not join group." },
      { status: 400 },
    );
  }
}
