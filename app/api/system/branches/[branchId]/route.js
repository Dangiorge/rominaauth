import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { branchId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  try {
    const before = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!before) {
      return NextResponse.json({ error: "Branch not found." }, { status: 404 });
    }

    const data = await prisma.branch.update({
      where: { id: branchId },
      data: {
        name: body.name,
        code: body.code,
        city: body.city,
        brand_id: body.brand_id,
        is_active: body.is_active,
        email: body.email || null,
        phone: body.phone || null,
        address_line1: body.address_line1 || null,
        address_line2: body.address_line2 || null,
        region: body.region || null,
        country: body.country || null,
        postal_code: body.postal_code || null,
        manager_name: body.manager_name || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        updated_at: new Date(),
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "branch.update",
      entityType: "branch",
      entityId: branchId,
      beforeData: before,
      afterData: data,
    });

    return NextResponse.json({ branch: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { branchId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const count = await prisma.userBranch.count({
      where: { branch_id: branchId },
    });

    if (count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${count} user(s) are scoped to this branch. Reassign them first.`,
        },
        { status: 409 },
      );
    }

    await prisma.branch.delete({
      where: { id: branchId },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "branch.delete",
      entityType: "branch",
      entityId: branchId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
