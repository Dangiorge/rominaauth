// path: app/api/settings/taxes/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateTaxClassPayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  const taxes = await prisma.taxClass.findMany({
    where: {
      deleted_at: null,
      ...(companyId && { company_id: Number(companyId) }),
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ taxes });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { valid, errors } = validateTaxClassPayload(body);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const existing = await prisma.taxClass.findUnique({
    where: { code: body.code },
  });
  if (existing)
    return NextResponse.json(
      { error: "A tax class with this code already exists." },
      { status: 409 },
    );

  const tax = await prisma.taxClass.create({
    data: {
      company_id: body.company_id,
      name: body.name,
      code: body.code,
      rate: body.rate || 0,
      is_inclusive: body.is_inclusive || false,
      is_taxable: body.is_taxable ?? true,
      created_by: session.user.id,
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "tax_class.create",
    entityType: "tax_class",
    entityId: tax.id,
    afterData: tax,
  });
  return NextResponse.json({ tax });
}
