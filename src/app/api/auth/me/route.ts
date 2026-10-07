import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    return NextResponse.json({ profile: await getSessionProfile() });
  } catch (err) {
    return handleApiError(err);
  }
}
