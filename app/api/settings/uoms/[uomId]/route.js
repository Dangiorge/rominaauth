// path: app/api/settings/uoms/[uomId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteUom } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function DELETE(req, { params }) {
  const { uomId } = await params;
  const id = Number(uomId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const guard = await canDeleteUom(id);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  await prisma.uom.delete({ where: { id } });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "uom.delete",
    entityType: "uom",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
