import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateItemPayload } from "@/lib/validation";
import { enforceFlagRules } from "@/lib/itemClassification";
import { canHardDeleteItem } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function GET(req, { params }) {
  const { itemId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await prisma.masterItem.findUnique({
      where: { id: itemId },
    });

    if (!data) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return NextResponse.json({ item: data });
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

  const body = await req.json();
  const { valid, errors } = validateItemPayload(body, { isUpdate: true });
  if (!valid) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  try {
    const before = await prisma.masterItem.findUnique({
      where: { id: itemId },
    });

    if (!before) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    if (body.sku && body.sku !== before.sku) {
      const dup = await prisma.masterItem.findFirst({
        where: {
          sku: body.sku,
          NOT: { id: itemId },
        },
        select: { id: true },
      });

      if (dup) {
        return NextResponse.json(
          { error: "Another item already uses this SKU." },
          { status: 409 },
        );
      }
    }

    if (body.barcode && body.barcode !== before.barcode) {
      const dup = await prisma.masterItem.findFirst({
        where: {
          barcode: body.barcode,
          NOT: { id: itemId },
        },
        select: { id: true },
      });

      if (dup) {
        return NextResponse.json(
          { error: "Another item already uses this barcode." },
          { status: 409 },
        );
      }
    }

    const itemType = body.item_type || before.item_type;
    const enforcedFlags = enforceFlagRules(itemType, {
      is_sellable: body.is_sellable ?? before.is_sellable,
      is_inventory: body.is_inventory ?? before.is_inventory,
      is_recipe_linked: body.is_recipe_linked ?? before.is_recipe_linked,
    });

    const updatePayload = {
      name: body.name ?? before.name,
      sku: body.sku ?? before.sku,
      barcode: "barcode" in body ? body.barcode || null : before.barcode,
      description:
        "description" in body ? body.description : before.description,
      category_id:
        "category_id" in body ? body.category_id : before.category_id,
      item_type: itemType,
      ...enforcedFlags,
      base_uom_id: body.base_uom_id ?? before.base_uom_id,
      purchase_uom_id:
        "purchase_uom_id" in body
          ? body.purchase_uom_id
          : before.purchase_uom_id,
      sales_uom_id:
        "sales_uom_id" in body ? body.sales_uom_id : before.sales_uom_id,
      tax_class_id:
        "tax_class_id" in body ? body.tax_class_id : before.tax_class_id,
      default_cost: body.default_cost ?? before.default_cost,
      is_batch_tracked: body.is_batch_tracked ?? before.is_batch_tracked,
      track_expiry: body.track_expiry ?? before.track_expiry,
      shelf_life_days:
        (body.track_expiry ?? before.track_expiry)
          ? (body.shelf_life_days ?? before.shelf_life_days)
          : null,
      status: body.status ?? before.status,
      updated_by: session.user.id,
      updated_at: new Date(),
    };

    const data = await prisma.masterItem.update({
      where: { id: itemId },
      data: updatePayload,
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "item.update",
      entityType: "master_item",
      entityId: itemId,
      beforeData: before,
      afterData: data,
    });

    return NextResponse.json({ item: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { itemId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const hard = searchParams.get("hard") === "true";

  try {
    if (hard) {
      const guard = await canHardDeleteItem(itemId);
      if (!guard.allowed) {
        return NextResponse.json({ error: guard.reason }, { status: 409 });
      }

      await prisma.masterItem.delete({
        where: { id: itemId },
      });
    } else {
      await prisma.masterItem.update({
        where: { id: itemId },
        data: {
          deleted_at: new Date(),
          status: "discontinued",
          updated_at: new Date(),
        },
      });
    }

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: hard ? "item.hard_delete" : "item.archive",
      entityType: "master_item",
      entityId: itemId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
