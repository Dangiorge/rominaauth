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

    const data = await prisma.taxClass.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ taxes: data }, { status: 200 });
  } catch (error) {
    console.error("GET /api/settings/taxes error:", error);
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
    const { name, code, rate, company_id, is_inclusive, is_taxable } = body;

    if (!name || !code || rate === undefined || rate === null || !company_id) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, code, rate, and company_id are required.",
        },
        { status: 400 },
      );
    }

    const numericRate = parseFloat(rate);
    if (isNaN(numericRate) || numericRate < 0) {
      return NextResponse.json(
        { error: "Tax rate must be a valid non-negative number." },
        { status: 400 },
      );
    }

    const parsedCompanyId = parseInt(company_id, 10);

    const existing = await prisma.taxClass.findFirst({
      where: {
        company_id: parsedCompanyId,
        code: code.trim(),
        deleted_at: null,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "A tax class with this code already exists for this company.",
        },
        { status: 409 },
      );
    }

    const data = await prisma.taxClass.create({
      data: {
        company_id: parsedCompanyId,
        name: name.trim(),
        code: code.trim(),
        rate: numericRate,
        is_inclusive: is_inclusive || false,
        is_taxable: is_taxable ?? true,
        created_by: session.user.id,
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "tax_class.create",
      entityType: "tax_class",
      entityId: data.id,
      afterData: data,
    });

    return NextResponse.json({ tax: data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/settings/taxes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
