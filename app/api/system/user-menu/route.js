import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ paths: [] }, { status: 401 });

    if (session.user.roleName === "super_admin") {
      // Note: Prisma uses camelCase for generated model accessors
      const paths = await prisma.registeredPath.findMany({
        where: { is_sidebar_visible: true },
        orderBy: [{ category: "asc" }, { label: "asc" }],
      });

      return NextResponse.json({ paths });
    }

    const paths = (session.user.permissions || [])
      .filter((p) => p.can_view && p.is_sidebar_visible)
      .map((p) => ({
        path: p.path,
        label: p.label,
        icon: p.icon,
        category: p.category,
      }));

    return NextResponse.json({ paths });
  } catch (error) {
    console.error("Failed to load user menu:", error);
    return NextResponse.json({ paths: [] }, { status: 500 });
  }
}
