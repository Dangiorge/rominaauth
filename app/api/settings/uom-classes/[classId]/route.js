// path: app/api/settings/uom-classes/[classId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteUomClass } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function DELETE(req, { params }) {
  const { classId } = await params;
  const id = Number(classId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const guard = await canDeleteUomClass(id);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  await prisma.uomClass.delete({ where: { id } });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "uom_class.delete",
    entityType: "uom_class",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
