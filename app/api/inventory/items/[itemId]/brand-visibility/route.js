// path: app/api/inventory/items/[itemId]/brand-visibility/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req, { params }) {
  const { itemId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await prisma.itemBrandVisibility.findMany({
    where: { item_id: itemId },
    select: { brand_id: true },
  });
  return NextResponse.json({
    isRestricted: rows.length > 0,
    restrictedToBrandIds: rows.map((r) => r.brand_id),
  });
}

export async function PUT(req, { params }) {
  const { itemId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { isRestricted, brandIds = [] } = await req.json();

  await prisma.$transaction([
    prisma.itemBrandVisibility.deleteMany({ where: { item_id: itemId } }),
    ...(isRestricted && brandIds.length
      ? [
          prisma.itemBrandVisibility.createMany({
            data: brandIds.map((brandId) => ({
              item_id: itemId,
              brand_id: brandId,
            })),
          }),
        ]
      : []),
  ]);

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "item.brand_visibility_update",
    entityType: "master_item",
    entityId: itemId,
    afterData: { isRestricted, brandIds },
  });

  return NextResponse.json({ success: true });
}
