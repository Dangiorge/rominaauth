// path: lib/document-permissions.js

import { prisma } from "@/lib/prisma";

export async function getUserDocumentPermissions(userId, categoryId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role_id: true,
        department_id: true,
        role: {
          select: { name: true },
        },
      },
    });

    if (!user) return { submit: false };

    // Super admins have full access
    if (user.role?.name === "super_admin") {
      return { submit: true, access_level: "FULL" };
    }

    // Check specific policy
    const policy = await prisma.documentAccessPolicy.findFirst({
      where: {
        role_id: user.role_id,
        OR: [
          { category_id: categoryId },
          { category_id: null }, // Global policy fallback
        ],
      },
    });

    if (!policy) {
      // Default fallback if no policy is defined
      return { submit: true, access_level: "EDIT" };
    }

    return {
      submit: policy.can_submit ?? true,
      access_level: policy.access_level || "EDIT",
    };
  } catch (error) {
    console.error("Error evaluating document access policy:", error);
    return { submit: false };
  }
}
