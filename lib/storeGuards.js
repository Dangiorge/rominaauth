// path: lib/storeGuards.js

import { prisma } from "./prisma";

export async function canDeleteStore(storeId) {
  const [grnCount, transferOutCount, transferInCount, movementCount] =
    await Promise.all([
      prisma.grn.count({ where: { store_id: storeId } }),
      prisma.internalTransfer.count({ where: { from_store_id: storeId } }),
      prisma.internalTransfer.count({ where: { to_store_id: storeId } }),
      prisma.stockMovement.count({ where: { store_id: storeId } }),
    ]);

  if (grnCount > 0)
    return {
      allowed: false,
      reason: `Cannot delete: ${grnCount} GRN(s) reference this store.`,
    };
  if (transferOutCount + transferInCount > 0) {
    return {
      allowed: false,
      reason: `Cannot delete: this store has ${transferOutCount + transferInCount} transfer(s) on record.`,
    };
  }
  if (movementCount > 0)
    return {
      allowed: false,
      reason: `Cannot delete: this store has stock movement history.`,
    };
  return { allowed: true };
}
