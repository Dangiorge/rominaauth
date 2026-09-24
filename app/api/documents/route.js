// path: app/api/documents/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserDocumentPermissions } from "@/lib/document-permissions";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const allDocs = await prisma.document.findMany({
      include: {
        department: { select: { id: true, name: true } },
        uploader: { select: { full_name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
    });

    // Check if the user is a super admin
    const isSuperAdmin =
      session.user.roleName === "super_admin" ||
      session.user.role === "super_admin" ||
      session.user.isSuperAdmin;

    const filteredDocs = [];
    for (const doc of allDocs) {
      let perms;

      if (isSuperAdmin) {
        // Automatically grant full permissions to super admins
        perms = {
          view: true,
          submit: true,
          approve: true,
          check: true,
          request_edit: true,
          access_level: "FULL",
        };
      } else {
        perms = await getUserDocumentPermissions(
          session.user.id,
          doc.category_id,
        );
      }

      if (perms?.view) {
        filteredDocs.push({
          ...doc,
          user_permissions: perms,
        });
      }
    }

    return NextResponse.json({ documents: filteredDocs });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
