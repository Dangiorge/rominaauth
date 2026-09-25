// path: app/api/inventory/grn/[grnId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  const { grnId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const grn = await prisma.grn.findUnique({
    where: { id: Number(grnId) },
    include: {
      store: true,
      creator: { select: { full_name: true } },
      lines: {
        include: { inventoryItem: { select: { code: true, name: true } } },
      },
    },
  });
  if (!grn)
    return NextResponse.json({ error: "GRN not found." }, { status: 404 });
  return NextResponse.json({ grn });
}
