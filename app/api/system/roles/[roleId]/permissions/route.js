// path: app/api/system/roles/[roleId]/permissions/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  const { roleId } = await params;
  const id = Number(roleId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const paths = await prisma.registeredPath.findMany({
    select: { id: true, path: true, label: true, category: true },
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  const existingPerms = await prisma.rolePermission.findMany({
    where: { role_id: id },
  });
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
  const id = Number(roleId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { pathId, can_view, can_create, can_edit, can_delete, custom_flags } =
    await req.json();

  await prisma.rolePermission.upsert({
    where: { role_id_path_id: { role_id: id, path_id: pathId } },
    update: {
      can_view,
      can_create,
      can_edit,
      can_delete,
      custom_flags: custom_flags || {},
    },
    create: {
      role_id: id,
      path_id: pathId,
      can_view,
      can_create,
      can_edit,
      can_delete,
      custom_flags: custom_flags || {},
    },
  });

  return NextResponse.json({ success: true });
}
