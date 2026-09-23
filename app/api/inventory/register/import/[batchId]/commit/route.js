// path: app/api/inventory/register/import/[batchId]/commit/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(req, { params }) {
  const { batchId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch)
    return NextResponse.json(
      { error: "Import batch not found." },
      { status: 404 },
    );
  if (batch.status !== "PREVIEWED") {
    return NextResponse.json(
      { error: `This batch is already ${batch.status.toLowerCase()}.` },
      { status: 409 },
    );
  }

  const actionableRows = await prisma.importBatchRow.findMany({
    where: { batch_id: batchId, action: { in: ["NEW", "CHANGED"] } },
  });

  for (const row of actionableRows) {
    const d = row.raw_data;
    const upserted = await prisma.inventoryItemRegister.upsert({
      where: { code_name: { code: d.code, name: d.name } },
      update: {
        uom: d.uom,
        child_category: d.child_category,
        parent_category: d.parent_category,
        default_value: d.default_value,
        default_tax: d.default_tax,
        state: d.state,
        source_created_at: d.source_created_at,
        source_type: d.source_type,
        source_modified_at: d.source_modified_at,
        updated_by: session.user.id,
        updated_at: new Date(),
      },
      create: {
        code: d.code,
        name: d.name,
        uom: d.uom,
        child_category: d.child_category,
        parent_category: d.parent_category,
        default_value: d.default_value,
        default_tax: d.default_tax,
        state: d.state,
        source_created_at: d.source_created_at,
        source_type: d.source_type,
        source_modified_at: d.source_modified_at,
        company_id: d.company_id || null,
        created_by: session.user.id,
      },
    });

    await prisma.importBatchRow.update({
      where: { id: row.id },
      data: { item_id: upserted.id },
    });
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: "COMMITTED", committed_at: new Date() },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "inventory_import.commit",
    entityType: "import_batch",
    entityId: batchId,
    afterData: {
      file_name: batch.file_name,
      new_count: batch.new_count,
      changed_count: batch.changed_count,
    },
  });

  return NextResponse.json({ success: true, applied: actionableRows.length });
}
