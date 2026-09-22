// path: app/api/documents/[documentId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  const { documentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      department: true,
      category: true,
      subcategory: true,
      uploader: { select: { id: true, full_name: true, email: true } },
      approver: { select: { id: true, full_name: true } },
      versions: { orderBy: { version_number: "desc" } },
    },
  });

  if (!document)
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  return NextResponse.json({ document });
}
