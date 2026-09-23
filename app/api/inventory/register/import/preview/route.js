// path: app/api/inventory/register/import/preview/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseInventoryExcel, diffInventoryRows } from "@/lib/inventoryImport";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const companyId = formData.get("company_id");

  if (!file)
    return NextResponse.json({ error: "A file is required." }, { status: 400 });

  let parsedRows;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsedRows = parseInventoryExcel(buffer);
  } catch (err) {
    return NextResponse.json(
      { error: `Could not read the file: ${err.message}` },
      { status: 400 },
    );
  }

  if (parsedRows.length === 0) {
    return NextResponse.json(
      { error: "No rows found in the file." },
      { status: 400 },
    );
  }

  const diffed = await diffInventoryRows(parsedRows);

  const counts = diffed.reduce(
    (acc, r) => ({
      ...acc,
      [r.action.toLowerCase()]: (acc[r.action.toLowerCase()] || 0) + 1,
    }),
    { new: 0, changed: 0, unchanged: 0, error: 0 },
  );

  const batch = await prisma.importBatch.create({
    data: {
      file_name: file.name,
      target_table: "inventory_item_register",
      total_rows: diffed.length,
      new_count: counts.new,
      changed_count: counts.changed,
      unchanged_count: counts.unchanged,
      error_count: counts.error,
      status: "PREVIEWED",
      uploaded_by: session.user.id,
    },
  });

  await prisma.importBatchRow.createMany({
    data: diffed.map((r) => ({
      batch_id: batch.id,
      row_number: r.row_number,
      action: r.action,
      raw_data: {
        code: r.code,
        name: r.name,
        uom: r.uom,
        child_category: r.child_category,
        parent_category: r.parent_category,
        default_value: r.default_value,
        default_tax: r.default_tax,
        state: r.state,
        source_created_at: r.source_created_at,
        source_type: r.source_type,
        source_modified_at: r.source_modified_at,
        company_id: companyId ? Number(companyId) : null,
      },
      changed_fields: r.changed_fields || null,
      error_message: r.error_message || null,
      item_id: r.existing_id || null,
    })),
  });

  // Only return NEW/CHANGED/ERROR rows in full detail — UNCHANGED rows can number in the thousands
  // and add nothing actionable to a review screen, so only their count is returned.
  const detailRows = diffed.filter((r) => r.action !== "UNCHANGED");

  return NextResponse.json({
    batchId: batch.id,
    counts,
    totalRows: diffed.length,
    rows: detailRows,
  });
}
