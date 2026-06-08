import { NextResponse } from "next/server";

import { listAvailablePredictionGroups } from "@/lib/server-groups";

export async function GET() {
  try {
    const groups = await listAvailablePredictionGroups();
    return NextResponse.json({ groups });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load available groups." },
      { status: 500 },
    );
  }
}
