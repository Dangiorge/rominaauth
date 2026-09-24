// path: app/api/documents/allowed-categories/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure prisma client exists
    if (!prisma) {
      throw new Error("Prisma client is not initialized.");
    }

    // Determine the correct delegate model name (handles 'category' or 'Category')
    const categoryModel =
      prisma.category || prisma.Category || prisma.documentCategory;
    if (!categoryModel) {
      throw new Error(
        "Category model delegate could not be found on Prisma client.",
      );
    }

    const roleName = session.user?.roleName || session.user?.role;
    const companyId = session.user?.company_id || session.user?.companyId;
    const roleId = session.user?.role_id || session.user?.roleId;

    let categories = [];

    if (
      roleName === "super_admin" ||
      !companyId ||
      !roleId ||
      !prisma.documentAccessPolicy
    ) {
      categories = await categoryModel.findMany({
        include: {
          subcategories: true,
        },
        orderBy: { name: "asc" },
      });
    } else {
      const policies = await prisma.documentAccessPolicy.findMany({
        where: {
          company_id: parseInt(companyId),
          role_id: parseInt(roleId),
        },
        include: {
          category: {
            include: {
              subcategories: true,
            },
          },
        },
      });

      if (policies.length === 0) {
        categories = await categoryModel.findMany({
          include: { subcategories: true },
          orderBy: { name: "asc" },
        });
      } else {
        const categoryMap = new Map();
        for (const policy of policies) {
          if (!policy.category_id) {
            const allCats = await categoryModel.findMany({
              include: { subcategories: true },
            });
            allCats.forEach((cat) => categoryMap.set(cat.id, cat));
            break;
          }
          if (policy.category) {
            categoryMap.set(policy.category.id, policy.category);
          }
        }
        categories = Array.from(categoryMap.values());
      }
    }

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Allowed categories error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
