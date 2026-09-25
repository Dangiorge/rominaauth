// path: lib/stockBalance.js

import { prisma } from "./prisma";

// Sums all movements for a given store+item into a single current balance.
// GRN_RECEIPT and TRANSFER_IN add; TRANSFER_OUT subtracts.
export async function getStoreItemBalance(storeId, inventoryItemId) {
  const movements = await prisma.stockMovement.findMany({
    where: { store_id: storeId, inventory_item_id: inventoryItemId },
    select: { movement_type: true, quantity: true },
  });

  return movements.reduce((balance, m) => {
    const qty = Number(m.quantity);
    return m.movement_type === "TRANSFER_OUT" ? balance - qty : balance + qty;
  }, 0);
}
