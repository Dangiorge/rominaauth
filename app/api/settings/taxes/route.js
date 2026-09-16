// path: app/api/settings/taxes/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateTaxClassPayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  let query = supabaseAdmin
    .from("tax_classes")
    .select("*")
    .is("deleted_at", null)
    .order("name");
  if (companyId) query = query.eq("company_id", companyId);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ taxes: data });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { valid, errors } = validateTaxClassPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("tax_classes")
    .select("id")
    .eq("code", body.code)
    .maybeSingle();
  if (existing)
    return NextResponse.json(
      { error: "A tax class with this code already exists." },
      { status: 409 },
    );

  const { data, error } = await supabaseAdmin
    .from("tax_classes")
    .insert({
      company_id: body.company_id,
      name: body.name,
      code: body.code,
      rate: body.rate || 0,
      is_inclusive: body.is_inclusive || false,
      is_taxable: body.is_taxable ?? true,
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "tax_class.create",
    entityType: "tax_class",
    entityId: data.id,
    afterData: data,
  });
  return NextResponse.json({ tax: data });
}
