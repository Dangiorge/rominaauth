// path: app/api/system/paths/[pathId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validatePathPayload } from "@/lib/validation";
import { canDeletePath } from "@/lib/guards";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { pathId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { valid, errors } = validatePathPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const { data: before } = await supabaseAdmin
    .from("registered_paths")
    .select("*")
    .eq("id", pathId)
    .single();
  if (!before)
    return NextResponse.json({ error: "Path not found." }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("registered_paths")
    .update({
      path: body.path,
      label: body.label,
      icon: body.icon || null,
      category: body.category || null,
      module: body.module || null,
      parent_id: body.parent_id || null,
      is_sidebar_visible: body.is_sidebar_visible ?? true,
      is_active: body.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pathId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "path.update",
    entityType: "path",
    entityId: pathId,
    beforeData: before,
    afterData: data,
  });

  return NextResponse.json({ path: data });
}

export async function DELETE(req, { params }) {
  const { pathId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const guard = await canDeletePath(pathId);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  const { error } = await supabaseAdmin
    .from("registered_paths")
    .delete()
    .eq("id", pathId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "path.delete",
    entityType: "path",
    entityId: pathId,
  });

  return NextResponse.json({ success: true });
}
