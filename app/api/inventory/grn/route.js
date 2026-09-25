// path: app/api/inventory/grn/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateGrnNumber } from "@/lib/documentNumbering";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const grns = await prisma.grn.findMany({
    include: {
      store: { select: { name: true, code: true } },
      creator: { select: { full_name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json({ grns });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const {
    store_id,
    supplier_name,
    reference_note,
    received_date,
    remarks,
    lines,
  } = body;

  if (
    !store_id ||
    !received_date ||
    !Array.isArray(lines) ||
    lines.length === 0
  ) {
    return NextResponse.json(
      {
        error: "Store, received date, and at least one line item are required.",
      },
      { status: 400 },
    );
  }
  for (const l of lines) {
    if (!l.inventory_item_id || !l.quantity || Number(l.quantity) <= 0) {
      return NextResponse.json(
        { error: "Every line needs an item and a positive quantity." },
        { status: 400 },
      );
    }
  }

  const store = await prisma.store.findUnique({
    where: { id: Number(store_id) },
  });
  if (!store)
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  if (store.grade !== "MAIN")
    return NextResponse.json(
      { error: "Only Main Stores can create a GRN." },
      { status: 409 },
    );

  const grnNumber = await generateGrnNumber(store.code);

  const grn = await prisma.$transaction(async (tx) => {
    const createdGrn = await tx.grn.create({
      data: {
        grn_number: grnNumber,
        store_id: store.id,
        supplier_name: supplier_name || null,
        reference_note: reference_note || null,
        received_date: new Date(received_date),
        remarks: remarks || null,
        created_by: session.user.id,
      },
    });

    for (const l of lines) {
      await tx.grnLine.create({
        data: {
          grn_id: createdGrn.id,
          inventory_item_id: Number(l.inventory_item_id),
          quantity: l.quantity,
          uom: l.uom || null,
          unit_cost: l.unit_cost || null,
          remarks: l.remarks || null,
        },
      });
      await tx.stockMovement.create({
        data: {
          store_id: store.id,
          inventory_item_id: Number(l.inventory_item_id),
          movement_type: "GRN_RECEIPT",
          quantity: l.quantity,
          uom: l.uom || null,
          unit_cost: l.unit_cost || null,
          reference_type: "GRN",
          reference_id: createdGrn.id,
          occurred_at: new Date(received_date),
          created_by: session.user.id,
        },
      });
    }

    return createdGrn;
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "grn.create",
    entityType: "grn",
    entityId: grn.id,
    afterData: {
      grn_number: grnNumber,
      store: store.name,
      line_count: lines.length,
    },
  });

  return NextResponse.json({ grn });
}
