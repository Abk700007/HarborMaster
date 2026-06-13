import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ ok: false, error: "Token is required" }, { status: 400 });
    }

    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "HarborMaster-PAT",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "Invalid GitHub Personal Access Token" });
    }

    const userData = await res.json();
    const username = userData.login || "";

    const cookieStore = await cookies();
    cookieStore.set("harbormaster_github_token", token, {
      path: "/",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });

    if (username) {
      cookieStore.set("harbormaster_github_user", username, {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return NextResponse.json({ ok: true, username });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || String(err) }, { status: 500 });
  }
}
