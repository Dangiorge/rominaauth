// path: app/api/settings/categories/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateCategoryPayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  let query = supabaseAdmin
    .from("item_categories")
    .select("*")
    .is("deleted_at", null)
    .order("level")
    .order("name");
  if (companyId) query = query.eq("company_id", companyId);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();

  let parentCategory = null;
  if (body.parent_id) {
    const { data } = await supabaseAdmin
      .from("item_categories")
      .select("*")
      .eq("id", body.parent_id)
      .single();
    parentCategory = data;
  }

  const { valid, errors } = validateCategoryPayload(body, parentCategory);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("item_categories")
    .select("id")
    .eq("code", body.code)
    .maybeSingle();
  if (existing)
    return NextResponse.json(
      { error: "A category with this code already exists." },
      { status: 409 },
    );

  const { data, error } = await supabaseAdmin
    .from("item_categories")
    .insert({
      company_id: body.company_id,
      name: body.name,
      code: body.code,
      level: body.level,
      parent_id: body.parent_id || null,
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "category.create",
    entityType: "item_category",
    entityId: data.id,
    afterData: data,
  });
  return NextResponse.json({ category: data });
}
