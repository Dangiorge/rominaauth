import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { departmentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  try {
    const before = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!before) {
      return NextResponse.json(
        { error: "Department not found." },
        { status: 404 },
      );
    }

    const data = await prisma.department.update({
      where: { id: departmentId },
      data: {
        name: body.name,
        code: body.code,
        is_active: body.is_active,
        updated_at: new Date(),
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "department.update",
      entityType: "department",
      entityId: departmentId,
      beforeData: before,
      afterData: data,
    });

    return NextResponse.json({ department: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { departmentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const count = await prisma.user.count({
      where: {
        department_id: departmentId,
        deleted_at: null,
      },
    });

    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${count} user(s) belong to this department.` },
        { status: 409 },
      );
    }

    await prisma.department.delete({
      where: { id: departmentId },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "department.delete",
      entityType: "department",
      entityId: departmentId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
