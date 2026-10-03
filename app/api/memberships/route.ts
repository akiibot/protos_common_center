import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listMemberships,
  transferOwnership,
  updateAccessRole,
  updateMembershipStatus,
} from "@/lib/convex-server";

export const dynamic = "force-dynamic";

const changeSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("change-role"),
    membershipId: z.string().min(1),
    accessRole: z.enum(["admin", "manager", "member", "viewer"]),
  }),
  z.object({
    action: z.literal("change-status"),
    membershipId: z.string().min(1),
    status: z.enum(["active", "deactivated"]),
  }),
  z.object({ action: z.literal("transfer-ownership"), membershipId: z.string().min(1) }),
  z.object({ action: z.literal("resend-invitation"), membershipId: z.string().min(1) }),
  z.object({ action: z.literal("cancel-invitation"), membershipId: z.string().min(1) }),
]);

async function getConvexToken() {
  const { getToken, sessionClaims, userId } = await auth();
  if (!userId) return null;
  return sessionClaims?.aud === "convex" ? getToken() : getToken({ template: "convex" });
}

function requestId() {
  return crypto.randomUUID();
}

export async function GET() {
  const correlationId = requestId();
  const token = await getConvexToken();
  if (!token) return NextResponse.json({ error: "Authentication is required", requestId: correlationId }, { status: 401 });

  try {
    const memberships = await listMemberships(token);
    return NextResponse.json({ memberships, requestId: correlationId }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("membership list failed", correlationId, error);
    return NextResponse.json({ error: "You cannot manage workspace access", requestId: correlationId }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  const correlationId = requestId();
  const token = await getConvexToken();
  if (!token) return NextResponse.json({ error: "Authentication is required", requestId: correlationId }, { status: 401 });
  if (process.env.DEPLOYMENT_READ_ONLY === "true") {
    return NextResponse.json({ error: "This deployment is read-only", requestId: correlationId }, { status: 403 });
  }

  const parsed = changeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid membership change", requestId: correlationId }, { status: 422 });
  }

  try {
    if (parsed.data.action === "resend-invitation" || parsed.data.action === "cancel-invitation") {
      const memberships = await listMemberships(token);
      const target = memberships.find((membership) => membership.id === parsed.data.membershipId);
      if (!target || target.status !== "invited") {
        return NextResponse.json({ error: "The invitation is no longer pending", requestId: correlationId }, { status: 409 });
      }

      const client = await clerkClient();
      const invitations = await client.invitations.getInvitationList({ query: target.email, status: "pending", limit: 100 });
      const matching = invitations.data.filter((invitation) => invitation.emailAddress.toLowerCase() === target.email.toLowerCase());
      await Promise.all(matching.map((invitation) => client.invitations.revokeInvitation(invitation.id)));

      if (parsed.data.action === "resend-invitation") {
        await client.invitations.createInvitation({
          emailAddress: target.email,
          redirectUrl: new URL("/", request.url).toString(),
          notify: true,
        });
      } else {
        await updateMembershipStatus(token, target.id, "deactivated");
      }
      return NextResponse.json({ ok: true, requestId: correlationId });
    }

    if (parsed.data.action === "change-role") {
      await updateAccessRole(token, parsed.data.membershipId, parsed.data.accessRole);
    } else if (parsed.data.action === "change-status") {
      await updateMembershipStatus(token, parsed.data.membershipId, parsed.data.status);
    } else {
      await transferOwnership(token, parsed.data.membershipId);
    }
    return NextResponse.json({ ok: true, requestId: correlationId });
  } catch (error) {
    console.error("membership change failed", correlationId, error);
    return NextResponse.json({ error: "The membership change was not allowed", requestId: correlationId }, { status: 403 });
  }
}
