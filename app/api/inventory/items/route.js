// path: app/api/inventory/items/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateItemPayload } from "@/lib/validation";
import { enforceFlagRules } from "@/lib/itemClassification";
import { logAudit } from "@/lib/audit";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const itemType = searchParams.get("itemType");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const items = await prisma.masterItem.findMany({
    where: {
      deleted_at: null,
      ...(companyId && { company_id: Number(companyId) }),
      ...(itemType && { item_type: itemType }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    select: {
      id: true,
      sku: true,
      barcode: true,
      name: true,
      image_url: true,
      item_type: true,
      is_sellable: true,
      is_inventory: true,
      status: true,
      default_cost: true,
      company_id: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const mapped = items.map((i) => ({ ...i, item_categories: i.category }));
  return NextResponse.json({ items: mapped });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { valid, errors } = validateItemPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const existingSku = await prisma.masterItem.findUnique({
    where: { sku: body.sku },
  });
  if (existingSku)
    return NextResponse.json(
      { error: "An item with this SKU already exists." },
      { status: 409 },
    );

  if (body.barcode) {
    const existingBarcode = await prisma.masterItem.findUnique({
      where: { barcode: body.barcode },
    });
    if (existingBarcode)
      return NextResponse.json(
        { error: "An item with this barcode already exists." },
        { status: 409 },
      );
  }

  const enforcedFlags = enforceFlagRules(body.item_type, {
    is_sellable: body.is_sellable || false,
    is_inventory: body.is_inventory ?? true,
    is_recipe_linked: body.is_recipe_linked || false,
  });

  const item = await prisma.masterItem.create({
    data: {
      company_id: body.company_id,
      sku: body.sku,
      barcode: body.barcode || null,
      name: body.name,
      description: body.description || null,
      category_id: body.category_id || null,
      item_type: body.item_type,
      ...enforcedFlags,
      base_uom_id: body.base_uom_id,
      purchase_uom_id: body.purchase_uom_id || null,
      sales_uom_id: body.sales_uom_id || null,
      tax_class_id: body.tax_class_id || null,
      default_cost: body.default_cost || 0,
      is_batch_tracked: body.is_batch_tracked || false,
      track_expiry: body.track_expiry || false,
      shelf_life_days: body.track_expiry ? body.shelf_life_days : null,
      asset_meta: body.item_type === "asset" ? body.asset_meta || {} : {},
      expense_meta: body.item_type === "expense" ? body.expense_meta || {} : {},
      created_by: session.user.id,
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "item.create",
    entityType: "master_item",
    entityId: item.id,
    afterData: item,
  });
  return NextResponse.json({ item });
}
