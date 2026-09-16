import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.roleName !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const companyId =
      searchParams.get("companyId") || searchParams.get("company_id");

    const where = {};
    if (companyId) where.company_id = companyId;

    const classes = await prisma.uomClass.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ classes }, { status: 200 });
  } catch (error) {
    console.error("GET /api/settings/uom-classes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.roleName !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, company_id } = body;

    if (!name || !company_id) {
      return NextResponse.json(
        { error: "Name and company_id are required." },
        { status: 400 },
      );
    }

    const existing = await prisma.uomClass.findFirst({
      where: {
        company_id,
        name: name.trim(),
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A class with this name already exists for this company." },
        { status: 409 },
      );
    }

    const data = await prisma.uomClass.create({
      data: {
        name: name.trim(),
        company_id,
        created_by: session.user.id,
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "uom_class.create",
      entityType: "uom_class",
      entityId: data.id,
      afterData: data,
    });

    return NextResponse.json({ class: data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/settings/uom-classes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
