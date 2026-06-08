import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { deleteSession, getSessionCookieOptions, sessionCookieName } from "@/lib/server-auth";

export async function POST() {
  const cookieStore = await cookies();
  await deleteSession(cookieStore.get(sessionCookieName)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}
