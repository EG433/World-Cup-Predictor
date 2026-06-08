import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { deletePredictionGroupForUser, getPredictionGroupByRouteId } from "@/lib/server-groups";
import { getUserFromSession, sessionCookieName } from "@/lib/server-auth";

interface GroupRouteProps {
  params: Promise<{ groupId: string }>;
}

export async function GET(_request: Request, { params }: GroupRouteProps) {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromSession(cookieStore.get(sessionCookieName)?.value);

    if (!user) {
      return NextResponse.json({ group: null }, { status: 401 });
    }

    const { groupId } = await params;
    const group = await getPredictionGroupByRouteId(groupId);

    return NextResponse.json({ group });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load group." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: GroupRouteProps) {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromSession(cookieStore.get(sessionCookieName)?.value);

    if (!user) {
      return NextResponse.json({ error: "Log in to delete a group." }, { status: 401 });
    }

    const { groupId } = await params;
    const result = await deletePredictionGroupForUser({
      routeGroupId: groupId,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete group." },
      { status: 400 },
    );
  }
}
