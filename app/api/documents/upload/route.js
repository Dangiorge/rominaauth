// path: app/api/documents/upload/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserCategoryPermissions } from "@/lib/document-permissions";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, category_id, file_path, file_size, mime_type } = body;

    // Validate Submit Privilege
    const perms = await getUserCategoryPermissions(
      session.user.id,
      parseInt(category_id),
    );
    if (!perms.submit && session.user.roleName !== "super_admin") {
      return NextResponse.json(
        {
          error:
            "Forbidden: You do not have submission access for this category.",
        },
        { status: 403 },
      );
    }

    const document = await prisma.document.create({
      data: {
        title,
        category_id: parseInt(category_id),
        file_path,
        file_size,
        mime_type,
        uploaded_by: session.user.id,
        company_id: session.user.company_id,
        status: "PENDING_APPROVAL",
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
