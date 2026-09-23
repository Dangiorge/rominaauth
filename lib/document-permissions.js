// path: lib/document-permissions.js

import { prisma } from "@/lib/prisma";

export async function getUserDocumentPermissions(userId, document) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role_id: true,
        company_id: true,
        department_id: true,
        role: { select: { name: true } },
      },
    });

    if (!user || !user.role_id) {
      return getDefaultPermissions(false);
    }

    // Super admin bypass
    if (user.role?.name === "super_admin") {
      return getDefaultPermissions(true);
    }

    // Fetch all relevant policies for this company and user's role
    const policies = await prisma.documentAccessPolicy.findMany({
      where: {
        company_id: user.company_id,
        role_id: user.role_id,
      },
    });

    // Find the most specific policy match:
    // Priority 1: Exact document_id match
    // Priority 2: Category match
    // Priority 3: Department match
    // Priority 4: Global fallback (all nulls except role_id/company_id)

    let matchedPolicy = null;

    if (document?.id) {
      matchedPolicy = policies.find((p) => p.document_id === document.id);
    }
    if (!matchedPolicy && document?.category_id) {
      matchedPolicy = policies.find(
        (p) => p.category_id === document.category_id,
      );
    }
    if (!matchedPolicy && document?.department_id) {
      matchedPolicy = policies.find(
        (p) => p.department_id === document.department_id,
      );
    }
    if (!matchedPolicy) {
      // Fallback to global role policy across company
      matchedPolicy = policies.find(
        (p) => !p.document_id && !p.category_id && !p.department_id,
      );
    }

    if (!matchedPolicy) {
      return getDefaultPermissions(false);
    }

    const p = matchedPolicy.permissions || {};
    return {
      view: !!p.view,
      submit: !!p.submit,
      approve: !!p.approve,
      check: !!p.check,
      request_edit: !!p.request_edit,
      approve_edit: !!p.approve_edit,
      view_type: p.view_type || "STANDARD",
    };
  } catch (err) {
    console.error("Error evaluating document access policy:", err);
    return getDefaultPermissions(false);
  }
}

function getDefaultPermissions(isAdmin) {
  return {
    view: isAdmin,
    submit: isAdmin,
    approve: isAdmin,
    check: isAdmin,
    request_edit: isAdmin,
    approve_edit: isAdmin,
    view_type: isAdmin ? "STANDARD" : "NONE",
  };
}
