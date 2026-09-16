// path: app/api/system/branches/route.js (replace the whole file)

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
    .from("branches")
    .select("*, brands ( id, name, company_id, companies ( id, name ) )")
    .order("name");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ branches: data });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name || !body.code || !body.brand_id) {
    return NextResponse.json(
      { error: "Name, code, and brand are required." },
      { status: 400 },
    );
  }
  const { data: existing } = await supabaseAdmin
    .from("branches")
    .select("id")
    .eq("code", body.code)
    .maybeSingle();
  if (existing)
    return NextResponse.json(
      { error: "A branch with this code already exists." },
      { status: 409 },
    );

  const { data, error } = await supabaseAdmin
    .from("branches")
    .insert({
      name: body.name,
      code: body.code,
      city: body.city || null,
      brand_id: body.brand_id,
      email: body.email || null,
      phone: body.phone || null,
      address_line1: body.address_line1 || null,
      address_line2: body.address_line2 || null,
      region: body.region || null,
      country: body.country || null,
      postal_code: body.postal_code || null,
      manager_name: body.manager_name || null,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "branch.create",
    entityType: "branch",
    entityId: data.id,
    afterData: data,
  });
  return NextResponse.json({ branch: data });
}
