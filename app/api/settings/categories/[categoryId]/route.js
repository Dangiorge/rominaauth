import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteCategory } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  try {
    const { categoryId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.roleName !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, level, parent_id, is_active } = body;

    if (parent_id && parent_id === categoryId) {
      return NextResponse.json(
        { error: "A category cannot be its own parent." },
        { status: 400 },
      );
    }

    const before = await prisma.itemCategory.findUnique({
      where: { id: categoryId },
    });

    if (!before || before.deleted_at !== null) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 },
      );
    }

    if (code && code.trim() !== before.code) {
      const dup = await prisma.itemCategory.findFirst({
        where: {
          company_id: before.company_id,
          code: code.trim(),
          NOT: { id: categoryId },
          deleted_at: null,
        },
        select: { id: true },
      });

      if (dup) {
        return NextResponse.json(
          { error: "Another category already uses this code." },
          { status: 409 },
        );
      }
    }

    const data = await prisma.itemCategory.update({
      where: { id: categoryId },
      data: {
        name: name ? name.trim() : before.name,
        code: code ? code.trim() : before.code,
        level: level !== undefined ? level : before.level,
        parent_id:
          parent_id !== undefined ? parent_id || null : before.parent_id,
        is_active: is_active ?? true,
        updated_by: session.user.id,
        updated_at: new Date(),
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "category.update",
      entityType: "item_category",
      entityId: categoryId,
      beforeData: before,
      afterData: data,
    });

    return NextResponse.json({ category: data }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/settings/categories/[categoryId] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { categoryId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.roleName !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const guard = await canDeleteCategory(categoryId);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason }, { status: 409 });
    }

    await prisma.itemCategory.update({
      where: { id: categoryId },
      data: {
        deleted_at: new Date(),
        is_active: false,
        updated_by: session.user.id,
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "category.delete",
      entityType: "item_category",
      entityId: categoryId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/settings/categories/[categoryId] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
