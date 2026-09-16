// path: app/api/settings/categories/[categoryId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateCategoryPayload } from "@/lib/validation";
import { canDeleteCategory } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { categoryId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();

  const { data: before } = await supabaseAdmin
    .from("item_categories")
    .select("*")
    .eq("id", categoryId)
    .single();
  if (!before)
    return NextResponse.json({ error: "Category not found." }, { status: 404 });

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

  if (body.code !== before.code) {
    const { data: dup } = await supabaseAdmin
      .from("item_categories")
      .select("id")
      .eq("code", body.code)
      .neq("id", categoryId)
      .maybeSingle();
    if (dup)
      return NextResponse.json(
        { error: "Another category already uses this code." },
        { status: 409 },
      );
  }

  const { data, error } = await supabaseAdmin
    .from("item_categories")
    .update({
      name: body.name,
      code: body.code,
      level: body.level,
      parent_id: body.parent_id || null,
      is_active: body.is_active ?? true,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "category.update",
    entityType: "item_category",
    entityId: categoryId,
    beforeData: before,
    afterData: data,
  });
  return NextResponse.json({ category: data });
}

export async function DELETE(req, { params }) {
  const { categoryId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const guard = await canDeleteCategory(categoryId);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  const { error } = await supabaseAdmin
    .from("item_categories")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", categoryId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "category.delete",
    entityType: "item_category",
    entityId: categoryId,
  });
  return NextResponse.json({ success: true });
}
