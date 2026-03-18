import { NextResponse } from "next/server";

import { runOfficialIngestion } from "@/lib/store";

export async function POST() {
  try {
    await runOfficialIngestion(true);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("UI-triggered DSE sync failed.", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
