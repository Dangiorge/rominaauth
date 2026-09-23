// path: app/api/documents/categories/[id]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// UPDATE Category
export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  try {
    const body = await req.json();
    const updated = await prisma.documentCategory.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name,
        code: body.code,
        description: body.description,
        is_active: body.is_active,
      },
    });
    return NextResponse.json({ category: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE Category (With Dependency Check)
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categoryId = parseInt(params.id);

  try {
    // 1. Check if any documents are directly linked to this category
    const linkedDocsCount = await prisma.document.count({
      where: { category_id: categoryId },
    });

    if (linkedDocsCount > 0) {
      return NextResponse.json(
        {
          error: `Deletion blocked: ${linkedDocsCount} document(s) are using this category.`,
        },
        { status: 400 },
      );
    }

    // 2. Check if subcategories belonging to this category have documents linked
    const subcategories = await prisma.documentSubCategory.findMany({
      where: { category_id: categoryId },
      select: { id: true },
    });
    const subcategoryIds = subcategories.map((s) => s.id);

    if (subcategoryIds.length > 0) {
      const linkedSubDocsCount = await prisma.document.count({
        where: { subcategory_id: { in: subcategoryIds } },
      });

      if (linkedSubDocsCount > 0) {
        return NextResponse.json(
          {
            error: `Deletion blocked: Subcategories under this category contain ${linkedSubDocsCount} document(s).`,
          },
          { status: 400 },
        );
      }
    }

    // 3. Safe to delete subcategories and then the category
    await prisma.documentSubCategory.deleteMany({
      where: { category_id: categoryId },
    });

    await prisma.documentCategory.delete({
      where: { id: categoryId },
    });

    return NextResponse.json(
      { success: true, message: "Category deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
