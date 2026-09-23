// path: app/api/documents/subcategories/[id]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// UPDATE Subcategory
export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  try {
    const body = await req.json();
    const updated = await prisma.documentSubCategory.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name,
        code: body.code,
        description: body.description,
        is_active: body.is_active,
      },
    });
    return NextResponse.json({ subcategory: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE Subcategory (With Dependency Check)
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subcategoryId = parseInt(params.id);

  try {
    // Check if any documents are linked to this subcategory
    const linkedDocsCount = await prisma.document.count({
      where: { subcategory_id: subcategoryId },
    });

    if (linkedDocsCount > 0) {
      return NextResponse.json(
        {
          error: `Deletion blocked: ${linkedDocsCount} document(s) are using this subcategory.`,
        },
        { status: 400 },
      );
    }

    await prisma.documentSubCategory.delete({
      where: { id: subcategoryId },
    });

    return NextResponse.json(
      { success: true, message: "Subcategory deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
