// path: app/api/settings/uom-conversions/route.js

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
    .from("uom_conversions")
    .select(
      "*, from_uom:uoms!uom_conversions_from_uom_id_fkey(code), to_uom:uoms!uom_conversions_to_uom_id_fkey(code)",
    )
    .order("id");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversions: data });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.from_uom_id || !body.to_uom_id || !body.conversion_factor) {
    return NextResponse.json(
      { error: "From unit, to unit, and factor are required." },
      { status: 400 },
    );
  }
  if (body.from_uom_id === body.to_uom_id) {
    return NextResponse.json(
      { error: "From and to units must be different." },
      { status: 400 },
    );
  }
  if (Number(body.conversion_factor) <= 0) {
    return NextResponse.json(
      { error: "Conversion factor must be positive." },
      { status: 400 },
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("uom_conversions")
    .select("id")
    .eq("from_uom_id", body.from_uom_id)
    .eq("to_uom_id", body.to_uom_id)
    .maybeSingle();
  if (existing)
    return NextResponse.json(
      { error: "This conversion already exists." },
      { status: 409 },
    );

  const { data, error } = await supabaseAdmin
    .from("uom_conversions")
    .insert({
      from_uom_id: body.from_uom_id,
      to_uom_id: body.to_uom_id,
      conversion_factor: body.conversion_factor,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "uom_conversion.create",
    entityType: "uom_conversion",
    entityId: data.id,
    afterData: data,
  });
  return NextResponse.json({ conversion: data });
}
