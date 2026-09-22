// path: app/api/system/roles/[roleId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateRolePayload } from "@/lib/validation";
import { canDeleteRole } from "@/lib/guards";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { roleId } = await params;
  const id = Number(roleId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const before = await prisma.role.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  if (before.is_system)
    return NextResponse.json(
      { error: "System roles cannot be modified." },
      { status: 409 },
    );

  const body = await req.json();
  const { valid, errors } = validateRolePayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const role = await prisma.role.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description || null,
      updated_at: new Date(),
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "role.update",
    entityType: "role",
    entityId: id,
    beforeData: before,
    afterData: role,
  });
  return NextResponse.json({ role });
}

export async function DELETE(req, { params }) {
  const { roleId } = await params;
  const id = Number(roleId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const guard = await canDeleteRole(id);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  await prisma.role.delete({ where: { id } });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "role.delete",
    entityType: "role",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
