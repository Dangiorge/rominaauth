// path: app/api/inventory/transfers/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTransferNumber } from "@/lib/documentNumbering";
import { getStoreItemBalance } from "@/lib/stockBalance";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const transfers = await prisma.internalTransfer.findMany({
    include: {
      fromStore: { select: { name: true, code: true } },
      toStore: { select: { name: true, code: true } },
      creator: { select: { full_name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json({ transfers });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { from_store_id, to_store_id, transfer_date, remarks, lines } = body;

  if (
    !from_store_id ||
    !to_store_id ||
    !transfer_date ||
    !Array.isArray(lines) ||
    lines.length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "From store, to store, date, and at least one line item are required.",
      },
      { status: 400 },
    );
  }
  if (Number(from_store_id) === Number(to_store_id)) {
    return NextResponse.json(
      { error: "From and to store must be different." },
      { status: 400 },
    );
  }

  const [fromStore, toStore] = await Promise.all([
    prisma.store.findUnique({ where: { id: Number(from_store_id) } }),
    prisma.store.findUnique({ where: { id: Number(to_store_id) } }),
  ]);
  if (!fromStore || !toStore)
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  if (fromStore.grade !== "MAIN")
    return NextResponse.json(
      { error: "Transfers must originate from a Main Store." },
      { status: 409 },
    );
  if (toStore.grade !== "SUB")
    return NextResponse.json(
      { error: "Transfers must go to a Sub Store." },
      { status: 409 },
    );

  for (const l of lines) {
    if (!l.inventory_item_id || !l.quantity || Number(l.quantity) <= 0) {
      return NextResponse.json(
        { error: "Every line needs an item and a positive quantity." },
        { status: 400 },
      );
    }
    const available = await getStoreItemBalance(
      fromStore.id,
      Number(l.inventory_item_id),
    );
    if (Number(l.quantity) > available) {
      return NextResponse.json(
        {
          error: `Insufficient stock: requested ${l.quantity} but only ${available} available at ${fromStore.name}.`,
        },
        { status: 409 },
      );
    }
  }

  const transferNumber = await generateTransferNumber(fromStore.code);

  const transfer = await prisma.$transaction(async (tx) => {
    const createdTransfer = await tx.internalTransfer.create({
      data: {
        transfer_number: transferNumber,
        from_store_id: fromStore.id,
        to_store_id: toStore.id,
        transfer_date: new Date(transfer_date),
        remarks: remarks || null,
        created_by: session.user.id,
      },
    });

    for (const l of lines) {
      await tx.internalTransferLine.create({
        data: {
          transfer_id: createdTransfer.id,
          inventory_item_id: Number(l.inventory_item_id),
          quantity: l.quantity,
          uom: l.uom || null,
          remarks: l.remarks || null,
        },
      });
      await tx.stockMovement.create({
        data: {
          store_id: fromStore.id,
          inventory_item_id: Number(l.inventory_item_id),
          movement_type: "TRANSFER_OUT",
          quantity: l.quantity,
          uom: l.uom || null,
          reference_type: "TRANSFER",
          reference_id: createdTransfer.id,
          occurred_at: new Date(transfer_date),
          created_by: session.user.id,
        },
      });
      await tx.stockMovement.create({
        data: {
          store_id: toStore.id,
          inventory_item_id: Number(l.inventory_item_id),
          movement_type: "TRANSFER_IN",
          quantity: l.quantity,
          uom: l.uom || null,
          reference_type: "TRANSFER",
          reference_id: createdTransfer.id,
          occurred_at: new Date(transfer_date),
          created_by: session.user.id,
        },
      });
    }

    return createdTransfer;
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "transfer.create",
    entityType: "internal_transfer",
    entityId: transfer.id,
    afterData: {
      transfer_number: transferNumber,
      from: fromStore.name,
      to: toStore.name,
      line_count: lines.length,
    },
  });

  return NextResponse.json({ transfer });
}
