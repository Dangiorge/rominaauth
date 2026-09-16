// path: lib/itemGuards.js

import { supabaseAdmin } from "./supabase";

export async function canDeleteCategory(categoryId) {
  const { count: childCount, error: childErr } = await supabaseAdmin
    .from("item_categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", categoryId);

  if (childErr)
    return { allowed: false, reason: "Could not verify child categories." };
  if (childCount > 0) {
    return {
      allowed: false,
      reason: `Cannot delete: ${childCount} sub-item(s) depend on this category.`,
    };
  }

  // master_items doesn't exist until Stage 2 — this check activates automatically once it does.
  const { error: tableCheckErr } = await supabaseAdmin
    .from("master_items")
    .select("id", { count: "exact", head: true })
    .limit(1);
  if (!tableCheckErr) {
    const { count: itemCount } = await supabaseAdmin
      .from("master_items")
      .select("id", { count: "exact", head: true })
      .eq("category_id", categoryId)
      .is("deleted_at", null);
    if (itemCount > 0)
      return {
        allowed: false,
        reason: `Cannot delete: ${itemCount} item(s) use this category.`,
      };
  }

  return { allowed: true };
}

export async function canDeleteUomClass(classId) {
  const { count, error } = await supabaseAdmin
    .from("uoms")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);

  if (error) return { allowed: false, reason: "Could not verify units." };
  if (count > 0)
    return {
      allowed: false,
      reason: `Cannot delete: ${count} unit(s) belong to this class.`,
    };
  return { allowed: true };
}

export async function canDeleteUom(uomId) {
  const { count: convCount, error: convErr } = await supabaseAdmin
    .from("uom_conversions")
    .select("id", { count: "exact", head: true })
    .or(`from_uom_id.eq.${uomId},to_uom_id.eq.${uomId}`);

  if (convErr)
    return { allowed: false, reason: "Could not verify conversions." };
  if (convCount > 0)
    return {
      allowed: false,
      reason: `Cannot delete: ${convCount} conversion(s) reference this unit.`,
    };

  const { error: tableCheckErr } = await supabaseAdmin
    .from("master_items")
    .select("id", { count: "exact", head: true })
    .limit(1);
  if (!tableCheckErr) {
    const { count: itemCount } = await supabaseAdmin
      .from("master_items")
      .select("id", { count: "exact", head: true })
      .or(
        `base_uom_id.eq.${uomId},purchase_uom_id.eq.${uomId},sales_uom_id.eq.${uomId}`,
      )
      .is("deleted_at", null);
    if (itemCount > 0)
      return {
        allowed: false,
        reason: `Cannot delete: ${itemCount} item(s) use this unit.`,
      };
  }

  return { allowed: true };
}

export async function canDeleteTaxClass(taxClassId) {
  const { error: tableCheckErr } = await supabaseAdmin
    .from("master_items")
    .select("id", { count: "exact", head: true })
    .limit(1);
  if (!tableCheckErr) {
    const { count } = await supabaseAdmin
      .from("master_items")
      .select("id", { count: "exact", head: true })
      .eq("tax_class_id", taxClassId)
      .is("deleted_at", null);
    if (count > 0)
      return {
        allowed: false,
        reason: `Cannot delete: ${count} item(s) use this tax class.`,
      };
  }
  return { allowed: true };
}
// path: lib/itemGuards.js (add this function to the existing file — keep canDeleteCategory, canDeleteUomClass, canDeleteUom, canDeleteTaxClass as they are)

export async function canHardDeleteItem(itemId) {
  const [basePrice, brandPrices, branchPrices] = await Promise.all([
    supabaseAdmin
      .from("item_base_prices")
      .select("id", { count: "exact", head: true })
      .eq("item_id", itemId),
    supabaseAdmin
      .from("item_brand_prices")
      .select("id", { count: "exact", head: true })
      .eq("item_id", itemId),
    supabaseAdmin
      .from("item_branch_prices")
      .select("id", { count: "exact", head: true })
      .eq("item_id", itemId),
  ]);

  const totalPriceRecords =
    (basePrice.count || 0) +
    (brandPrices.count || 0) +
    (branchPrices.count || 0);
  if (totalPriceRecords > 0) {
    return {
      allowed: false,
      reason: `Cannot permanently delete: this item has ${totalPriceRecords} price record(s). Use archive (soft delete) instead.`,
    };
  }
  return { allowed: true };
}
