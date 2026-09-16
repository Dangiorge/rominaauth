// path: app/api/settings/uom-classes/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateUomClassPayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await supabaseAdmin
    .from("uom_classes")
    .select("*")
    .order("name");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ classes: data });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { valid, errors } = validateUomClassPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("uom_classes")
    .select("id")
    .eq("name", body.name)
    .maybeSingle();
  if (existing)
    return NextResponse.json(
      { error: "A class with this name already exists." },
      { status: 409 },
    );

  const { data, error } = await supabaseAdmin
    .from("uom_classes")
    .insert({ name: body.name })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "uom_class.create",
    entityType: "uom_class",
    entityId: data.id,
    afterData: data,
  });
  return NextResponse.json({ class: data });
}
