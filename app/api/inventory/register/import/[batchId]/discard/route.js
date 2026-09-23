// path: app/api/inventory/register/import/[batchId]/discard/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  const { batchId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch)
    return NextResponse.json(
      { error: "Import batch not found." },
      { status: 404 },
    );
  if (batch.status !== "PREVIEWED") {
    return NextResponse.json(
      { error: `This batch is already ${batch.status.toLowerCase()}.` },
      { status: 409 },
    );
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: "DISCARDED" },
  });
  return NextResponse.json({ success: true });
}
