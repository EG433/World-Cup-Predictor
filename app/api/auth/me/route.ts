import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getUserFromSession, sessionCookieName } from "@/lib/server-auth";

export async function GET() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(sessionCookieName)?.value);

  return NextResponse.json({ user });
}
