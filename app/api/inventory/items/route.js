// path: app/api/inventory/items/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
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

  let query = supabaseAdmin
    .from("master_items")
    .select(
      "id, sku, barcode, name, image_url, item_type, is_sellable, is_inventory, status, default_cost, company_id, item_categories ( name )",
    )
    .is("deleted_at", null)
    .order("name");

  if (companyId) query = query.eq("company_id", companyId);
  if (itemType) query = query.eq("item_type", itemType);
  if (status) query = query.eq("status", status);
  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
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

  const { data: existingSku } = await supabaseAdmin
    .from("master_items")
    .select("id")
    .eq("sku", body.sku)
    .maybeSingle();
  if (existingSku)
    return NextResponse.json(
      { error: "An item with this SKU already exists." },
      { status: 409 },
    );

  if (body.barcode) {
    const { data: existingBarcode } = await supabaseAdmin
      .from("master_items")
      .select("id")
      .eq("barcode", body.barcode)
      .maybeSingle();
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

  const { data, error } = await supabaseAdmin
    .from("master_items")
    .insert({
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
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "item.create",
    entityType: "master_item",
    entityId: data.id,
    afterData: data,
  });
  return NextResponse.json({ item: data });
}
