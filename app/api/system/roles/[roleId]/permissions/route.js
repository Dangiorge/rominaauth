// path: app/api/system/roles/[roleId]/permissions/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req, { params }) {
  const { roleId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: paths, error: pathsError } = await supabaseAdmin
    .from("registered_paths")
    .select("id, path, label, category")
    .order("category", { ascending: true })
    .order("label", { ascending: true });

  if (pathsError)
    return NextResponse.json({ error: pathsError.message }, { status: 500 });

  const { data: existingPerms, error: permsError } = await supabaseAdmin
    .from("role_permissions")
    .select("*")
    .eq("role_id", roleId);

  if (permsError)
    return NextResponse.json({ error: permsError.message }, { status: 500 });

  const permMap = new Map(existingPerms.map((p) => [p.path_id, p]));

  const merged = paths.map((p) => {
    const existing = permMap.get(p.id);
    return {
      path_id: p.id,
      path: p.path,
      label: p.label,
      can_view: existing?.can_view ?? false,
      can_create: existing?.can_create ?? false,
      can_edit: existing?.can_edit ?? false,
      can_delete: existing?.can_delete ?? false,
      custom_flags: existing?.custom_flags ?? {},
    };
  });

  return NextResponse.json({ permissions: merged });
}

export async function PUT(req, { params }) {
  const { roleId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { pathId, can_view, can_create, can_edit, can_delete, custom_flags } =
    await req.json();

  const { error } = await supabaseAdmin.from("role_permissions").upsert(
    {
      role_id: roleId,
      path_id: pathId,
      can_view,
      can_create,
      can_edit,
      can_delete,
      custom_flags: custom_flags || {},
    },
    { onConflict: "role_id,path_id" },
  );

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
