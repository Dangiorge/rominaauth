// path: app/api/system/departments/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ departments });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name || !body.code)
    return NextResponse.json(
      { error: "Name and code are required." },
      { status: 400 },
    );

  const existing = await prisma.department.findUnique({
    where: { code: body.code },
  });
  if (existing)
    return NextResponse.json(
      { error: "A department with this code already exists." },
      { status: 409 },
    );

  const department = await prisma.department.create({
    data: { name: body.name, code: body.code },
  });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "department.create",
    entityType: "department",
    entityId: department.id,
    afterData: department,
  });
  return NextResponse.json({ department });
}
