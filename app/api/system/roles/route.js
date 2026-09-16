// path: app/api/system/roles/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateRolePayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Include a live user count per role — needed by the UI to explain why delete is blocked
  const { data: roles, error } = await supabaseAdmin
    .from("roles")
    .select("*")
    .order("name");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: counts } = await supabaseAdmin
    .from("users")
    .select("role_id")
    .is("deleted_at", null);

  const countMap = {};
  (counts || []).forEach((u) => {
    countMap[u.role_id] = (countMap[u.role_id] || 0) + 1;
  });

  const enriched = roles.map((r) => ({
    ...r,
    user_count: countMap[r.id] || 0,
  }));
  return NextResponse.json({ roles: enriched });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { valid, errors } = validateRolePayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("name", body.name)
    .maybeSingle();
  if (existing)
    return NextResponse.json(
      { error: "A role with this name already exists." },
      { status: 409 },
    );

  const { data, error } = await supabaseAdmin
    .from("roles")
    .insert({ name: body.name, description: body.description || null })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "role.create",
    entityType: "role",
    entityId: data.id,
    afterData: data,
  });

  return NextResponse.json({ role: data });
}
