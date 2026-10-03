import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/convex-server";

export async function POST() {
  const { getToken, sessionClaims, userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });

  const user = await currentUser();
  const verifiedEmail = user?.primaryEmailAddress?.emailAddress;
  if (!verifiedEmail) return NextResponse.json({ error: "A verified email is required" }, { status: 400 });

  const token = sessionClaims?.aud === "convex" ? await getToken() : await getToken({ template: "convex" });
  if (!token) return NextResponse.json({ error: "Convex authentication is unavailable" }, { status: 503 });

  try {
    const access = await ensureCurrentUser(token, verifiedEmail);
    return NextResponse.json(access, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("workspace access provisioning failed", error);
    return NextResponse.json({ error: "This account does not have workspace access" }, { status: 403 });
  }
}
