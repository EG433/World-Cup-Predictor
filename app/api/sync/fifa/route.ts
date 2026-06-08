import { NextResponse } from "next/server";

import { syncOfficialFifaData, syncOfficialFifaDataIfStale } from "@/lib/fifa-sync";

export async function GET() {
  try {
    const result = await syncOfficialFifaDataIfStale({ minimumMinutesBetweenChecks: 24 * 60 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync FIFA data." },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const result = await syncOfficialFifaData();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync FIFA data." },
      { status: 500 },
    );
  }
}
