// path: app/api/system/roles/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateRolePayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
  const counts = await prisma.user.groupBy({
    by: ["role_id"],
    where: { deleted_at: null },
    _count: true,
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.role_id, c._count]));

  const enriched = roles.map((r) => ({
    ...r,
    user_count: countMap[r.id] || 0,
  }));
  return NextResponse.json({ roles: enriched });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { valid, errors } = validateRolePayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const existing = await prisma.role.findUnique({ where: { name: body.name } });
  if (existing)
    return NextResponse.json(
      { error: "A role with this name already exists." },
      { status: 409 },
    );

  const role = await prisma.role.create({
    data: { name: body.name, description: body.description || null },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "role.create",
    entityType: "role",
    entityId: role.id,
    afterData: role,
  });
  return NextResponse.json({ role });
}
