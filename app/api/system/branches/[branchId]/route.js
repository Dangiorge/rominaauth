// path: app/api/system/branches/[branchId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { branchId } = await params;
  const id = Number(branchId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const before = await prisma.branch.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json({ error: "Branch not found." }, { status: 404 });

  const branch = await prisma.branch.update({
    where: { id },
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
    entityId: id,
    beforeData: before,
    afterData: branch,
  });
  return NextResponse.json({ branch });
}

export async function DELETE(req, { params }) {
  const { branchId } = await params;
  const id = Number(branchId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userCount = await prisma.userBranch.count({ where: { branch_id: id } });
  if (userCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${userCount} user(s) are scoped to this branch. Reassign them first.`,
      },
      { status: 409 },
    );
  }

  await prisma.branch.delete({ where: { id } });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "branch.delete",
    entityType: "branch",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
