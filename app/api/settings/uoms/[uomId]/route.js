import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteUom } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function DELETE(req, { params }) {
  const { uomId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const guard = await canDeleteUom(uomId);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason }, { status: 409 });
    }

    await prisma.uom.delete({
      where: { id: uomId },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "uom.delete",
      entityType: "uom",
      entityId: uomId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
