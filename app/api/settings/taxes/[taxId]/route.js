// path: app/api/settings/taxes/[taxId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateTaxClassPayload } from "@/lib/validation";
import { canDeleteTaxClass } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { taxId } = await params;
  const id = Number(taxId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { valid, errors } = validateTaxClassPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const before = await prisma.taxClass.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json(
      { error: "Tax class not found." },
      { status: 404 },
    );

  if (body.code !== before.code) {
    const dup = await prisma.taxClass.findFirst({
      where: { code: body.code, NOT: { id } },
    });
    if (dup)
      return NextResponse.json(
        { error: "Another tax class already uses this code." },
        { status: 409 },
      );
  }

  const tax = await prisma.taxClass.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      rate: body.rate || 0,
      is_inclusive: body.is_inclusive,
      is_taxable: body.is_taxable,
      is_active: body.is_active ?? true,
      updated_by: session.user.id,
      updated_at: new Date(),
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "tax_class.update",
    entityType: "tax_class",
    entityId: id,
    beforeData: before,
    afterData: tax,
  });
  return NextResponse.json({ tax });
}

export async function DELETE(req, { params }) {
  const { taxId } = await params;
  const id = Number(taxId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const guard = await canDeleteTaxClass(id);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  await prisma.taxClass.update({
    where: { id },
    data: { deleted_at: new Date(), is_active: false },
  });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "tax_class.delete",
    entityType: "tax_class",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
