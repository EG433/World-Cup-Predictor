import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createPredictionGroup,
  listUserPredictionGroups,
  listUserPredictionGroupsByUsername,
  reconcileUserGroupMemberships,
} from "@/lib/server-groups";
import { getUserFromSession, sessionCookieName } from "@/lib/server-auth";
import type { FriendPool } from "@/types/world-cup";

async function getSignedInUser() {
  const cookieStore = await cookies();
  return getUserFromSession(cookieStore.get(sessionCookieName)?.value);
}

export async function GET() {
  try {
    const user = await getSignedInUser();

    if (!user) {
      return NextResponse.json({ groups: [] });
    }

    let groups: FriendPool[] = [];

    try {
      await reconcileUserGroupMemberships(user);
      groups = await listUserPredictionGroups(user.id);
    } catch {
      groups = [];
    }

    if (groups.length === 0) {
      try {
        groups = await listUserPredictionGroupsByUsername(user.username);
      } catch {
        groups = [];
      }
    }

    return NextResponse.json({ groups });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load groups." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSignedInUser();

    if (!user) {
      return NextResponse.json({ error: "Log in to create a group." }, { status: 401 });
    }

    const body = (await request.json()) as {
      name?: string;
      privacy?: "public" | "private";
      password?: string;
      routeGroupId?: string;
    };
    const group = await createPredictionGroup({
      name: body.name ?? "",
      scoringMode: "traditional",
      privacy: body.privacy === "private" ? "private" : "public",
      password: body.password,
      routeGroupId: body.routeGroupId,
      user,
    });

    return NextResponse.json({ group });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create group." },
      { status: 400 },
    );
  }
}
