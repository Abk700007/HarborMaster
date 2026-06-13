import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const oauthEnabled = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  return NextResponse.json({
    oauthEnabled,
    clientId: process.env.GITHUB_CLIENT_ID || "",
  });
}
