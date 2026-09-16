// path: lib/scopes.js

import { prisma } from "./prisma";

export async function getUserScopes(userId) {
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

  return {
    companyIds: companies.map((r) => r.company_id),
    brandIds: brands.map((r) => r.brand_id),
    branchIds: branches.map((r) => r.branch_id),
    primaryBranchId: branches.find((r) => r.is_primary)?.branch_id || null,
  };
}
