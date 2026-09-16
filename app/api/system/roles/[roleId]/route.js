// path: app/api/system/roles/[roleId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateRolePayload } from "@/lib/validation";
import { canDeleteRole } from "@/lib/guards";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { roleId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: before } = await supabaseAdmin
    .from("roles")
    .select("*")
    .eq("id", roleId)
    .single();
  if (!before)
    return NextResponse.json({ error: "Role not found." }, { status: 404 });

  if (before.is_system) {
    return NextResponse.json(
      { error: "System roles cannot be modified." },
      { status: 409 },
    );
  }

  const body = await req.json();
  const { valid, errors } = validateRolePayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("roles")
    .update({
      name: body.name,
      description: body.description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roleId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "role.update",
    entityType: "role",
    entityId: roleId,
    beforeData: before,
    afterData: data,
  });

  return NextResponse.json({ role: data });
}

export async function DELETE(req, { params }) {
  const { roleId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const guard = await canDeleteRole(roleId);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  const { error } = await supabaseAdmin.from("roles").delete().eq("id", roleId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "role.delete",
    entityType: "role",
    entityId: roleId,
  });

  return NextResponse.json({ success: true });
}
