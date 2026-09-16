// path: app/api/settings/uoms/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateUomPayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await supabaseAdmin
    .from("uoms")
    .select("*, uom_classes ( id, name )")
    .order("code");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ uoms: data });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { valid, errors } = validateUomPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("uoms")
    .select("id")
    .eq("code", body.code)
    .maybeSingle();
  if (existing)
    return NextResponse.json(
      { error: "A unit with this code already exists." },
      { status: 409 },
    );

  const { data, error } = await supabaseAdmin
    .from("uoms")
    .insert({
      code: body.code,
      name: body.name,
      class_id: body.class_id,
      is_base_unit: body.is_base_unit || false,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "uom.create",
    entityType: "uom",
    entityId: data.id,
    afterData: data,
  });
  return NextResponse.json({ uom: data });
}
