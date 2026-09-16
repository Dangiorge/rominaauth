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
    const rawCompanyId =
      searchParams.get("companyId") || searchParams.get("company_id");

    const where = { deleted_at: null };
    if (rawCompanyId) {
      where.company_id = parseInt(rawCompanyId, 10);
    }

    const categories = await prisma.itemCategory.findMany({
      where,
      orderBy: [{ level: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("GET /api/settings/categories error:", error);
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
    const { name, code, company_id, level, parent_id } = body;

    if (!name || !code || !company_id) {
      return NextResponse.json(
        { error: "Name, code, and company_id are required." },
        { status: 400 },
      );
    }

    const parsedCompanyId = parseInt(company_id, 10);

    const existing = await prisma.itemCategory.findFirst({
      where: {
        company_id: parsedCompanyId,
        code: code.trim(),
        deleted_at: null,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A category with this code already exists for this company." },
        { status: 409 },
      );
    }

    const data = await prisma.itemCategory.create({
      data: {
        company_id: parsedCompanyId,
        name: name.trim(),
        code: code.trim(),
        level: level || 1,
        parent_id: parent_id || null,
        created_by: session.user.id,
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "category.create",
      entityType: "item_category",
      entityId: data.id,
      afterData: data,
    });

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/settings/categories error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
