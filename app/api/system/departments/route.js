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

  try {
    const data = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ departments: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, code } = await req.json();
  if (!name || !code) {
    return NextResponse.json(
      { error: "Name and code are required." },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.department.findFirst({
      where: { code },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A department with this code already exists." },
        { status: 409 },
      );
    }

    const data = await prisma.department.create({
      data: { name, code },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "department.create",
      entityType: "department",
      entityId: data.id,
      afterData: data,
    });

    return NextResponse.json({ department: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
