// path: app/api/system/departments/route.js

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
    .from("departments")
    .select("*")
    .order("name");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ departments: data });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name, code } = await req.json();
  if (!name || !code)
    return NextResponse.json(
      { error: "Name and code are required." },
      { status: 400 },
    );

  const { data: existing } = await supabaseAdmin
    .from("departments")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (existing)
    return NextResponse.json(
      { error: "A department with this code already exists." },
      { status: 409 },
    );

  const { data, error } = await supabaseAdmin
    .from("departments")
    .insert({ name, code })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "department.create",
    entityType: "department",
    entityId: data.id,
    afterData: data,
  });
  return NextResponse.json({ department: data });
}
