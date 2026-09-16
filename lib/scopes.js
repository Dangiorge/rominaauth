// path: lib/scopes.js

import { supabaseAdmin } from "./supabase";

export async function getUserScopes(userId) {
  const [companiesRes, brandsRes, branchesRes] = await Promise.all([
    supabaseAdmin
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userId),
    supabaseAdmin.from("user_brands").select("brand_id").eq("user_id", userId),
    supabaseAdmin
      .from("user_branches")
      .select("branch_id, is_primary")
      .eq("user_id", userId),
  ]);

  return {
    companyIds: (companiesRes.data || []).map((r) => r.company_id),
    brandIds: (brandsRes.data || []).map((r) => r.brand_id),
    branchIds: (branchesRes.data || []).map((r) => r.branch_id),
    primaryBranchId:
      (branchesRes.data || []).find((r) => r.is_primary)?.branch_id || null,
  };
}
