// path: app/api/system/companies/[companyId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PUT(req, { params }) {
  const { companyId } = await params;
  const id = Number(companyId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const before = await prisma.company.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json({ error: "Company not found." }, { status: 404 });

  const company = await prisma.company.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      is_active: body.is_active,
      email: body.email || null,
      phone: body.phone || null,
      website: body.website || null,
      tax_id: body.tax_id || null,
      address_line1: body.address_line1 || null,
      address_line2: body.address_line2 || null,
      city: body.city || null,
      region: body.region || null,
      country: body.country || null,
      postal_code: body.postal_code || null,
      primary_color: body.primary_color,
      secondary_color: body.secondary_color,
      accent_color: body.accent_color,
      updated_at: new Date(),
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "company.update",
    entityType: "company",
    entityId: id,
    beforeData: before,
    afterData: company,
  });
  return NextResponse.json({ company });
}

export async function DELETE(req, { params }) {
  const { companyId } = await params;
  const id = Number(companyId);
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const brandCount = await prisma.brand.count({ where: { company_id: id } });
  if (brandCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${brandCount} brand(s) belong to this company. Remove or reassign them first.`,
      },
      { status: 409 },
    );
  }
  const userCount = await prisma.userCompany.count({
    where: { company_id: id },
  });
  if (userCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${userCount} user(s) are scoped to this company.`,
      },
      { status: 409 },
    );
  }

  await prisma.company.delete({ where: { id } });
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "company.delete",
    entityType: "company",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
