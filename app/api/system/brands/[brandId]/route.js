// path: app/api/system/brands/[brandId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

// path: app/api/system/brands/[brandId]/route.js (replace the PUT function)

export async function PUT(req, { params }) {
  const { brandId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { data: before } = await supabaseAdmin
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .single();
  if (!before)
    return NextResponse.json({ error: "Brand not found." }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("brands")
    .update({
      name: body.name,
      slug: body.slug,
      company_id: body.company_id,
      is_active: body.is_active,
      email: body.email || null,
      phone: body.phone || null,
      address_line1: body.address_line1 || null,
      address_line2: body.address_line2 || null,
      city: body.city || null,
      region: body.region || null,
      country: body.country || null,
      postal_code: body.postal_code || null,
      uses_custom_theme: body.uses_custom_theme,
      primary_color: body.uses_custom_theme ? body.primary_color : null,
      secondary_color: body.uses_custom_theme ? body.secondary_color : null,
      accent_color: body.uses_custom_theme ? body.accent_color : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", brandId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "brand.update",
    entityType: "brand",
    entityId: brandId,
    beforeData: before,
    afterData: data,
  });
  return NextResponse.json({ brand: data });
}

export async function DELETE(req, { params }) {
  const { brandId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count, error: countErr } = await supabaseAdmin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId);

  if (countErr)
    return NextResponse.json(
      { error: "Could not verify brand usage." },
      { status: 500 },
    );
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} branch(es) belong to this brand.` },
      { status: 409 },
    );
  }

  const { count: userCount } = await supabaseAdmin
    .from("user_brands")
    .select("user_id", { count: "exact", head: true })
    .eq("brand_id", brandId);

  if (userCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${userCount} user(s) are scoped to this brand.`,
      },
      { status: 409 },
    );
  }

  const { error } = await supabaseAdmin
    .from("brands")
    .delete()
    .eq("id", brandId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "brand.delete",
    entityType: "brand",
    entityId: brandId,
  });
  return NextResponse.json({ success: true });
}
