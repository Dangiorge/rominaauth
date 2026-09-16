import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateUomPayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await prisma.uom.findMany({
      orderBy: { code: "asc" },
      include: {
        uom_classes: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ uoms: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { valid, errors } = validateUomPayload(body);
  if (!valid) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  try {
    const existing = await prisma.uom.findFirst({
      where: { code: body.code },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A unit with this code already exists." },
        { status: 409 },
      );
    }

    const data = await prisma.uom.create({
      data: {
        code: body.code,
        name: body.name,
        class_id: body.class_id,
        is_base_unit: body.is_base_unit || false,
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "uom.create",
      entityType: "uom",
      entityId: data.id,
      afterData: data,
    });

    return NextResponse.json({ uom: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
