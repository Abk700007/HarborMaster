import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!res.ok) {
      return new Response("Failed to fetch access token from GitHub", { status: 500 });
    }

    const data = await res.json();
    if (data.error) {
      return new Response(`GitHub OAuth Error: ${data.error_description || data.error}`, { status: 400 });
    }

    const accessToken = data.access_token;

    // Fetch user details to get the username
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "HarborMaster-OAuth",
      },
    });

    let username = "";
    if (userRes.ok) {
      const userData = await userRes.json();
      username = userData.login || "";
    }

    const cookieStore = await cookies();
    cookieStore.set("harbormaster_github_token", accessToken, {
      path: "/",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    if (username) {
      cookieStore.set("harbormaster_github_user", username, {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    // Redirect to home and proceed straight to onboarding
    const homeUrl = new URL("/", request.url);
    homeUrl.searchParams.set("stage", "onboarding");
    return NextResponse.redirect(homeUrl.toString());
  } catch (err: any) {
    return new Response(`OAuth Exchange Failed: ${err.message || String(err)}`, { status: 500 });
  }
}
