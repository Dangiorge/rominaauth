// path: app/api/settings/categories/[categoryId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateCategoryPayload } from "@/lib/validation";
import { canDeleteCategory } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { categoryId } = await params;
  const id = Number(categoryId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();

  const before = await prisma.itemCategory.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json({ error: "Category not found." }, { status: 404 });

  let parentCategory = null;
  if (body.parent_id)
    parentCategory = await prisma.itemCategory.findUnique({
      where: { id: body.parent_id },
    });

  const { valid, errors } = validateCategoryPayload(body, parentCategory);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  if (body.code !== before.code) {
    const dup = await prisma.itemCategory.findFirst({
      where: { code: body.code, NOT: { id } },
    });
    if (dup)
      return NextResponse.json(
        { error: "Another category already uses this code." },
        { status: 409 },
      );
  }

  const category = await prisma.itemCategory.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      level: body.level,
      parent_id: body.parent_id || null,
      is_active: body.is_active ?? true,
      updated_by: session.user.id,
      updated_at: new Date(),
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "category.update",
    entityType: "item_category",
    entityId: id,
    beforeData: before,
    afterData: category,
  });
  return NextResponse.json({ category });
}

export async function DELETE(req, { params }) {
  const { categoryId } = await params;
  const id = Number(categoryId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const guard = await canDeleteCategory(id);
  if (!guard.allowed)
    return NextResponse.json({ error: guard.reason }, { status: 409 });

  await prisma.itemCategory.update({
    where: { id },
    data: { deleted_at: new Date(), is_active: false },
  });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "category.delete",
    entityType: "item_category",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
