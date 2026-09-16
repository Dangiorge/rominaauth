// path: app/api/inventory/items/[itemId]/brand-visibility/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export async function GET(req, { params }) {
  const { itemId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("item_brand_visibility")
    .select("brand_id")
    .eq("item_id", itemId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    isRestricted: data.length > 0,
    restrictedToBrandIds: data.map((r) => r.brand_id),
  });
}

export async function PUT(req, { params }) {
  const { itemId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { isRestricted, brandIds = [] } = await req.json();

  // Always clear first, then re-insert — simplest way to guarantee consistency
  await supabaseAdmin
    .from("item_brand_visibility")
    .delete()
    .eq("item_id", itemId);

  if (isRestricted && brandIds.length > 0) {
    const { error } = await supabaseAdmin
      .from("item_brand_visibility")
      .insert(
        brandIds.map((brandId) => ({ item_id: itemId, brand_id: brandId })),
      );
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
