// path: app/api/documents/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserDocumentPermissions } from "@/lib/document-permissions";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let documents;

    // Super admins can view all documents across the repository
    if (session.user.roleName === "super_admin") {
      documents = await prisma.document.findMany({
        include: {
          category: true,
          subcategory: true,
          uploader: {
            select: { id: true, full_name: true, email: true },
          },
          department: true,
          company: true,
        },
        orderBy: { created_at: "desc" },
      });
    } else {
      // For standard users, filter based on ownership or department accessibility
      documents = await prisma.document.findMany({
        where: {
          OR: [
            { uploader_id: session.user.id },
            { department_id: session.user.department_id },
          ],
        },
        include: {
          category: true,
          subcategory: true,
          uploader: {
            select: { id: true, full_name: true, email: true },
          },
          department: true,
          company: true,
        },
        orderBy: { created_at: "desc" },
      });
    }

    // Attach granular user permissions for UI action controls (Download, Check Integrity, etc.)
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        let perms = { view: true, submit: false, check: true, edit: false };

        if (session.user.roleName !== "super_admin" && doc.category_id) {
          const catPerms = await getUserDocumentPermissions(
            session.user.id,
            doc.category_id,
          );
          if (catPerms) {
            perms = {
              view: catPerms.view || catPerms.access_level !== "NONE",
              submit:
                catPerms.submit ||
                catPerms.access_level === "EDIT" ||
                catPerms.access_level === "FULL",
              check: true,
              edit:
                catPerms.access_level === "EDIT" ||
                catPerms.access_level === "FULL",
            };
          }
        } else if (session.user.roleName === "super_admin") {
          perms = { view: true, submit: true, check: true, edit: true };
        }

        return {
          ...doc,
          user_permissions: perms,
        };
      }),
    );

    return NextResponse.json({ documents: enrichedDocuments }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
