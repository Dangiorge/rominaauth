// path: lib/inventoryImport.js

import * as XLSX from "xlsx";
import { prisma } from "./prisma";

const COMPARABLE_FIELDS = [
  "uom",
  "child_category",
  "parent_category",
  "default_value",
  "default_tax",
  "state",
  "source_created_at",
  "source_type",
  "source_modified_at",
];

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function toDecimal(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function toInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

// Parses the uploaded buffer into normalized row objects matching our schema's field names.
export function parseInventoryExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  return rawRows.map((row, index) => {
    // Trim keys defensively — the source file has a trailing space on "Modified ".
    const get = (key) => row[key] ?? row[key.trim()] ?? row[`${key} `] ?? null;

    return {
      row_number: index + 2, // +2 accounts for header row + 1-indexing, matches what you'd see in Excel
      code: get("Code")?.toString().trim() || null,
      name: get("Name")?.toString().trim() || null,
      uom: get("UOM")?.toString().trim() || null,
      child_category: get("Child Category")?.toString().trim() || null,
      parent_category: get("Parent Category")?.toString().trim() || null,
      default_value: toDecimal(get("Default Value")),
      default_tax: toInt(get("Default Tax")),
      state: get("State")?.toString().trim() || null,
      source_created_at: toDate(get("Create on")),
      source_type: toInt(get("Type")),
      source_modified_at: toDate(get("Modified")),
    };
  });
}

function fieldsEqual(a, b) {
  if (a instanceof Date || b instanceof Date) {
    const aTime = a ? new Date(a).getTime() : null;
    const bTime = b ? new Date(b).getTime() : null;
    return aTime === bTime;
  }
  if (typeof a === "number" || typeof b === "number") {
    return Number(a ?? 0) === Number(b ?? 0);
  }
  return (a ?? null) === (b ?? null);
}

// Compares parsed rows against what's already in the DB, classifying each as
// NEW / CHANGED / UNCHANGED / ERROR. Also catches duplicate (code, name) pairs within the file itself.
export async function diffInventoryRows(parsedRows) {
  const seenInFile = new Set();
  const results = [];

  const keys = parsedRows
    .filter((r) => r.code && r.name)
    .map((r) => ({ code: r.code, name: r.name }));

  const existing = keys.length
    ? await prisma.inventoryItemRegister.findMany({
        where: { OR: keys.map((k) => ({ code: k.code, name: k.name })) },
      })
    : [];

  const existingMap = new Map(existing.map((e) => [`${e.code}::${e.name}`, e]));

  for (const row of parsedRows) {
    if (!row.code || !row.name) {
      results.push({
        ...row,
        action: "ERROR",
        error_message: !row.code ? "Code is missing." : "Name is missing.",
      });
      continue;
    }

    const key = `${row.code}::${row.name}`;
    if (seenInFile.has(key)) {
      results.push({
        ...row,
        action: "ERROR",
        error_message:
          "Duplicate Code + Name combination within this same file.",
      });
      continue;
    }
    seenInFile.add(key);

    const match = existingMap.get(key);
    if (!match) {
      results.push({ ...row, action: "NEW" });
      continue;
    }

    const changedFields = {};
    for (const field of COMPARABLE_FIELDS) {
      if (!fieldsEqual(row[field], match[field])) {
        changedFields[field] = { old: match[field], new: row[field] };
      }
    }

    if (Object.keys(changedFields).length > 0) {
      results.push({
        ...row,
        action: "CHANGED",
        changed_fields: changedFields,
        existing_id: match.id,
      });
    } else {
      results.push({ ...row, action: "UNCHANGED", existing_id: match.id });
    }
  }

  return results;
}
