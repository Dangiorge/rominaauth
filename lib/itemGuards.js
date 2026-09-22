// path: lib/itemGuards.js

import { prisma } from "./prisma";

export async function canDeleteCategory(categoryId) {
  const childCount = await prisma.itemCategory.count({
    where: { parent_id: categoryId },
  });
  if (childCount > 0) {
    return {
      allowed: false,
      reason: `Cannot delete: ${childCount} sub-item(s) depend on this category.`,
    };
  }

  const itemCount = await prisma.masterItem.count({
    where: { category_id: categoryId, deleted_at: null },
  });
  if (itemCount > 0) {
    return {
      allowed: false,
      reason: `Cannot delete: ${itemCount} item(s) use this category.`,
    };
  }
  return { allowed: true };
}

export async function canDeleteUomClass(classId) {
  const count = await prisma.uom.count({ where: { class_id: classId } });
  if (count > 0)
    return {
      allowed: false,
      reason: `Cannot delete: ${count} unit(s) belong to this class.`,
    };
  return { allowed: true };
}

export async function canDeleteUom(uomId) {
  const convCount = await prisma.uomConversion.count({
    where: { OR: [{ from_uom_id: uomId }, { to_uom_id: uomId }] },
  });
  if (convCount > 0)
    return {
      allowed: false,
      reason: `Cannot delete: ${convCount} conversion(s) reference this unit.`,
    };

  const itemCount = await prisma.masterItem.count({
    where: {
      deleted_at: null,
      OR: [
        { base_uom_id: uomId },
        { purchase_uom_id: uomId },
        { sales_uom_id: uomId },
      ],
    },
  });
  if (itemCount > 0)
    return {
      allowed: false,
      reason: `Cannot delete: ${itemCount} item(s) use this unit.`,
    };
  return { allowed: true };
}

export async function canDeleteTaxClass(taxClassId) {
  const count = await prisma.masterItem.count({
    where: { tax_class_id: taxClassId, deleted_at: null },
  });
  if (count > 0)
    return {
      allowed: false,
      reason: `Cannot delete: ${count} item(s) use this tax class.`,
    };
  return { allowed: true };
}

// Pricing tables (item_base_prices / item_brand_prices / item_branch_prices) from Item Master Stage 3
// don't exist in the schema yet — this is a placeholder that always allows hard-delete for now.
// Extend this once Stage 3 (pricing) is built, mirroring the checks above.
export async function canHardDeleteItem(itemId) {
  return { allowed: true };
}
