// path: app/api/system/users/[userId]/scopes/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req, { params }) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [companies, brands, branches] = await Promise.all([
    prisma.userCompany.findMany({
      where: { user_id: userId },
      select: { company_id: true },
    }),
    prisma.userBrand.findMany({
      where: { user_id: userId },
      select: { brand_id: true },
    }),
    prisma.userBranch.findMany({
      where: { user_id: userId },
      select: { branch_id: true, is_primary: true },
    }),
  ]);

  return NextResponse.json({
    companyIds: companies.map((r) => r.company_id),
    brandIds: brands.map((r) => r.brand_id),
    branchIds: branches.map((r) => r.branch_id),
    primaryBranchId: branches.find((r) => r.is_primary)?.branch_id || null,
  });
}

export async function PUT(req, { params }) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    companyIds = [],
    brandIds = [],
    branchIds = [],
    primaryBranchId = null,
  } = await req.json();

  await prisma.$transaction([
    prisma.userCompany.deleteMany({ where: { user_id: userId } }),
    prisma.userBrand.deleteMany({ where: { user_id: userId } }),
    prisma.userBranch.deleteMany({ where: { user_id: userId } }),
    ...(companyIds.length
      ? [
          prisma.userCompany.createMany({
            data: companyIds.map((id) => ({ user_id: userId, company_id: id })),
          }),
        ]
      : []),
    ...(brandIds.length
      ? [
          prisma.userBrand.createMany({
            data: brandIds.map((id) => ({ user_id: userId, brand_id: id })),
          }),
        ]
      : []),
    ...(branchIds.length
      ? [
          prisma.userBranch.createMany({
            data: branchIds.map((id) => ({
              user_id: userId,
              branch_id: id,
              is_primary: id === primaryBranchId,
            })),
          }),
        ]
      : []),
  ]);

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "user.scopes_update",
    entityType: "user",
    entityId: userId,
    afterData: { companyIds, brandIds, branchIds, primaryBranchId },
  });

  return NextResponse.json({ success: true });
}
