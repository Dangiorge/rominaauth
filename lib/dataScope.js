// path: lib/dataScope.js

// A user is a Global Admin if they're super_admin, or if they have zero assigned
// companies/brands/branches (per the original spec: no scoping = full access).
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

// Applies scoping to a Supabase query builder chain based on the user's CURRENTLY ACTIVE
// selection (active_branch_id / active_brand_id from the switcher), not just their full allowed set.
//
// Rules:
// - Global Admin -> bypass filtering entirely.
// - active_branch_id set to a specific ID -> WHERE branch_id = active_branch_id
// - active_branch_id === 'ALL' (or unset) -> WHERE branch_id = ANY(user_allowed_branches)
// Same pattern applies for scopeColumn = 'brand_id'.
export function applyScope(query, session, scopeColumn = "branch_id") {
  if (isGlobalAdmin(session)) return query;

  const scopes = session.user.scopes || {};

  if (scopeColumn === "branch_id") {
    const activeBranchId = session.user.activeBranchId;
    const allowedIds = scopes.branchIds || [];

    if (activeBranchId && activeBranchId !== "ALL") {
      const numericId = Number(activeBranchId);
      // Defense in depth: re-verify against the allowed set even though the JWT callback
      // already validates this on every switch — never trust a client-supplied ID blindly.
      if (!allowedIds.includes(numericId)) return query.in(scopeColumn, [-1]);
      return query.eq(scopeColumn, numericId);
    }

    if (allowedIds.length === 0) return query.in(scopeColumn, [-1]); // no access -> zero rows, safely
    return query.in(scopeColumn, allowedIds);
  }

  if (scopeColumn === "brand_id") {
    const activeBrandId = session.user.activeBrandId;
    const allowedIds = scopes.brandIds || [];

    if (activeBrandId && activeBrandId !== "ALL") {
      const numericId = Number(activeBrandId);
      if (!allowedIds.includes(numericId)) return query.in(scopeColumn, [-1]);
      return query.eq(scopeColumn, numericId);
    }

    if (allowedIds.length === 0) return query.in(scopeColumn, [-1]);
    return query.in(scopeColumn, allowedIds);
  }

  if (scopeColumn === "company_id") {
    const allowedIds = scopes.companyIds || [];
    if (allowedIds.length === 0) return query.in(scopeColumn, [-1]);
    return query.in(scopeColumn, allowedIds);
  }

  return query;
}
