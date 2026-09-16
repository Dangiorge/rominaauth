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

  try {
    const data = await prisma.itemBrandVisibility.findMany({
      where: { item_id: itemId },
      select: { brand_id: true },
    });

    return NextResponse.json({
      isRestricted: data.length > 0,
      restrictedToBrandIds: data.map((r) => r.brand_id),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const { itemId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { isRestricted, brandIds = [] } = await req.json();

  try {
    // Transaction to clear old visibility and recreate if restricted
    await prisma.$transaction(async (tx) => {
      await tx.itemBrandVisibility.deleteMany({
        where: { item_id: itemId },
      });

      if (isRestricted && brandIds.length > 0) {
        await tx.itemBrandVisibility.createMany({
          data: brandIds.map((brandId) => ({
            item_id: itemId,
            brand_id: brandId,
          })),
        });
      }
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "item.brand_visibility_update",
      entityType: "master_item",
      entityId: itemId,
      afterData: { isRestricted, brandIds },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
