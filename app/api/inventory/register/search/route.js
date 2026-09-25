// path: app/api/inventory/register/search/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  if (q.length < 2) return NextResponse.json({ items: [] });

  const items = await prisma.inventoryItemRegister.findMany({
    where: {
      deleted_at: null,
      OR: [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, code: true, name: true, uom: true },
    take: 20,
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ items });
}
