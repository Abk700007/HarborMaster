import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return new Response("GitHub OAuth not configured", { status: 400 });
  }

  const redirectUri = new URL("/api/auth/github/callback", request.url).toString();
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=repo,read:org,user`;
  
  return redirect(url);
}
