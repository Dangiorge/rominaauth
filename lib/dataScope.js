// path: lib/dataScope.js

export function isGlobalAdmin(session) {
  if (!session?.user) return false;
  if (session.user.roleName === "super_admin") return true;

  const scopes = session.user.scopes || {};
  return (
    (!scopes.companyIds || scopes.companyIds.length === 0) &&
    (!scopes.brandIds || scopes.brandIds.length === 0) &&
    (!scopes.branchIds || scopes.branchIds.length === 0)
  );
}

// Returns a partial Prisma `where` object, spread into your query:
//   const rows = await prisma.someModel.findMany({ where: { ...buildScopeFilter(session, 'branch_id'), status: 'active' } });
//
// Rules:
// - Global Admin -> {} (no filtering)
// - active_branch_id set to a specific ID -> { branch_id: <id> }
// - active_branch_id === 'ALL' (or unset) -> { branch_id: { in: [...allowed] } }
// - no allowed IDs at all -> { branch_id: { in: [-1] } } (zero rows, safely)
export function buildScopeFilter(session, scopeColumn = "branch_id") {
  if (isGlobalAdmin(session)) return {};

  const scopes = session.user.scopes || {};

  if (scopeColumn === "branch_id") {
    const activeBranchId = session.user.activeBranchId;
    const allowedIds = scopes.branchIds || [];

    if (activeBranchId && activeBranchId !== "ALL") {
      const numericId = Number(activeBranchId);
      if (!allowedIds.includes(numericId)) return { branch_id: { in: [-1] } };
      return { branch_id: numericId };
    }
    if (allowedIds.length === 0) return { branch_id: { in: [-1] } };
    return { branch_id: { in: allowedIds } };
  }

  if (scopeColumn === "brand_id") {
    const activeBrandId = session.user.activeBrandId;
    const allowedIds = scopes.brandIds || [];

    if (activeBrandId && activeBrandId !== "ALL") {
      const numericId = Number(activeBrandId);
      if (!allowedIds.includes(numericId)) return { brand_id: { in: [-1] } };
      return { brand_id: numericId };
    }
    if (allowedIds.length === 0) return { brand_id: { in: [-1] } };
    return { brand_id: { in: allowedIds } };
  }

  if (scopeColumn === "company_id") {
    const allowedIds = scopes.companyIds || [];
    if (allowedIds.length === 0) return { company_id: { in: [-1] } };
    return { company_id: { in: allowedIds } };
  }

  return {};
}
