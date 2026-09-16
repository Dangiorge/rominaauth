// path: app/api/system/companies/route.js (replace the whole file)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .order("name");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ companies: data });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name || !body.code)
    return NextResponse.json(
      { error: "Name and code are required." },
      { status: 400 },
    );

  const { data: existing } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("code", body.code)
    .maybeSingle();
  if (existing)
    return NextResponse.json(
      { error: "A company with this code already exists." },
      { status: 409 },
    );

  const { data, error } = await supabaseAdmin
    .from("companies")
    .insert({
      name: body.name,
      code: body.code,
      email: body.email || null,
      phone: body.phone || null,
      website: body.website || null,
      tax_id: body.tax_id || null,
      address_line1: body.address_line1 || null,
      address_line2: body.address_line2 || null,
      city: body.city || null,
      region: body.region || null,
      country: body.country || null,
      postal_code: body.postal_code || null,
      primary_color: body.primary_color || "#0f172a",
      secondary_color: body.secondary_color || "#64748b",
      accent_color: body.accent_color || "#3b82f6",
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "company.create",
    entityType: "company",
    entityId: data.id,
    afterData: data,
  });
  return NextResponse.json({ company: data });
}
