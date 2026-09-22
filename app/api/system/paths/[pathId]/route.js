// path: app/api/system/paths/[pathId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePathPayload } from "@/lib/validation";
import { canDeletePath } from "@/lib/guards";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { pathId } = await params;
  const id = Number(pathId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { valid, errors } = validatePathPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const before = await prisma.registeredPath.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json({ error: "Path not found." }, { status: 404 });

  const path = await prisma.registeredPath.update({
    where: { id },
    data: {
      path: body.path,
      label: body.label,
      icon: body.icon || null,
      category: body.category || null,
      module: body.module || null,
      parent_id: body.parent_id || null,
      is_sidebar_visible: body.is_sidebar_visible ?? true,
      is_active: body.is_active ?? true,
      updated_at: new Date(),
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "path.update",
    entityType: "path",
    entityId: id,
    beforeData: before,
    afterData: path,
  });
  return NextResponse.json({ path });
}

export async function DELETE(req, { params }) {
  const { pathId } = await params;
  const id = Number(pathId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const guard = await canDeletePath(id);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  await prisma.registeredPath.delete({ where: { id } });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "path.delete",
    entityType: "path",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
