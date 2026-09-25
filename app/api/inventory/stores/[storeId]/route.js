// path: app/api/inventory/stores/[storeId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteStore } from "@/lib/storeGuards";
import { logAudit } from "@/lib/audit";

function validateParent(body) {
  const hasBranch = !!body.branch_id;
  const hasCompany = !!body.company_id;
  if (hasBranch === hasCompany) {
    return "A store must be linked to exactly one of: a Branch, or a Company (standalone) — not both, not neither.";
  }
  return null;
}

export async function PUT(req, { params }) {
  const { storeId } = await params;
  const id = Number(storeId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parentError = validateParent(body);
  if (parentError)
    return NextResponse.json({ error: parentError }, { status: 400 });

  const before = await prisma.store.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json({ error: "Store not found." }, { status: 404 });

  const store = await prisma.store.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      grade: body.grade,
      branch_id: body.branch_id ? Number(body.branch_id) : null,
      company_id: body.company_id ? Number(body.company_id) : null,
      description: body.description || null,
      is_active: body.is_active ?? true,
      updated_by: session.user.id,
      updated_at: new Date(),
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "store.update",
    entityType: "store",
    entityId: id,
    beforeData: before,
    afterData: store,
  });
  return NextResponse.json({ store });
}

export async function DELETE(req, { params }) {
  const { storeId } = await params;
  const id = Number(storeId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const guard = await canDeleteStore(id);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  await prisma.store.update({
    where: { id },
    data: { deleted_at: new Date(), is_active: false },
  });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "store.delete",
    entityType: "store",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
