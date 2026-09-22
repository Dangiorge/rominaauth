// path: app/api/settings/uoms/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateUomPayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const uoms = await prisma.uom.findMany({
    include: { uomClass: { select: { id: true, name: true } } },
    orderBy: { code: "asc" },
  });
  const mapped = uoms.map((u) => ({ ...u, uom_classes: u.uomClass }));
  return NextResponse.json({ uoms: mapped });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { valid, errors } = validateUomPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const existing = await prisma.uom.findUnique({ where: { code: body.code } });
  if (existing)
    return NextResponse.json(
      { error: "A unit with this code already exists." },
      { status: 409 },
    );

  const uom = await prisma.uom.create({
    data: {
      code: body.code,
      name: body.name,
      class_id: body.class_id,
      is_base_unit: body.is_base_unit || false,
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "uom.create",
    entityType: "uom",
    entityId: uom.id,
    afterData: uom,
  });
  return NextResponse.json({ uom });
}
