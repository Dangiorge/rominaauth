// path: app/api/system/departments/[departmentId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { departmentId } = await params;
  const id = Number(departmentId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const before = await prisma.department.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json(
      { error: "Department not found." },
      { status: 404 },
    );

  const department = await prisma.department.update({
    where: { id },
    data: { name: body.name, code: body.code, is_active: body.is_active },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "department.update",
    entityType: "department",
    entityId: id,
    beforeData: before,
    afterData: department,
  });
  return NextResponse.json({ department });
}

export async function DELETE(req, { params }) {
  const { departmentId } = await params;
  const id = Number(departmentId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userCount = await prisma.user.count({
    where: { department_id: id, deleted_at: null },
  });
  if (userCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${userCount} user(s) belong to this department.`,
      },
      { status: 409 },
    );
  }

  await prisma.department.delete({ where: { id } });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "department.delete",
    entityType: "department",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
