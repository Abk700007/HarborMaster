import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("harbormaster_github_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "HarborMaster-Repos",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `GitHub API error: ${res.statusText}` }, { status: res.status });
    }

    const repos = await res.json();
    const mapped = repos.map((r: any) => ({
      name: r.name,
      owner: r.owner.login,
      fullName: r.full_name,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
