// path: app/api/settings/taxes/[taxId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateTaxClassPayload } from "@/lib/validation";
import { canDeleteTaxClass } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { taxId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { valid, errors } = validateTaxClassPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const { data: before } = await supabaseAdmin
    .from("tax_classes")
    .select("*")
    .eq("id", taxId)
    .single();
  if (!before)
    return NextResponse.json(
      { error: "Tax class not found." },
      { status: 404 },
    );

  if (body.code !== before.code) {
    const { data: dup } = await supabaseAdmin
      .from("tax_classes")
      .select("id")
      .eq("code", body.code)
      .neq("id", taxId)
      .maybeSingle();
    if (dup)
      return NextResponse.json(
        { error: "Another tax class already uses this code." },
        { status: 409 },
      );
  }

  const { data, error } = await supabaseAdmin
    .from("tax_classes")
    .update({
      name: body.name,
      code: body.code,
      rate: body.rate || 0,
      is_inclusive: body.is_inclusive,
      is_taxable: body.is_taxable,
      is_active: body.is_active ?? true,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taxId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "tax_class.update",
    entityType: "tax_class",
    entityId: taxId,
    beforeData: before,
    afterData: data,
  });
  return NextResponse.json({ tax: data });
}

export async function DELETE(req, { params }) {
  const { taxId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const guard = await canDeleteTaxClass(taxId);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  const { error } = await supabaseAdmin
    .from("tax_classes")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", taxId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "tax_class.delete",
    entityType: "tax_class",
    entityId: taxId,
  });
  return NextResponse.json({ success: true });
}
