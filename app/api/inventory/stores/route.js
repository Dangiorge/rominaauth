// path: app/api/inventory/stores/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

function validateParent(body) {
  const hasBranch = !!body.branch_id;
  const hasCompany = !!body.company_id;
  if (hasBranch === hasCompany) {
    return "A store must be linked to exactly one of: a Branch, or a Company (standalone) — not both, not neither.";
  }
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const stores = await prisma.store.findMany({
    where: { deleted_at: null },
    include: {
      branch: {
        select: { id: true, name: true, brand: { select: { name: true } } },
      },
      company: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ stores });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name || !body.code || !body.grade) {
    return NextResponse.json(
      { error: "Name, code, and grade are required." },
      { status: 400 },
    );
  }
  const parentError = validateParent(body);
  if (parentError)
    return NextResponse.json({ error: parentError }, { status: 400 });
  if (!["MAIN", "SUB"].includes(body.grade)) {
    return NextResponse.json(
      { error: "Grade must be MAIN or SUB." },
      { status: 400 },
    );
  }

  const existing = await prisma.store.findUnique({
    where: { code: body.code },
  });
  if (existing)
    return NextResponse.json(
      { error: "A store with this code already exists." },
      { status: 409 },
    );

  const store = await prisma.store.create({
    data: {
      name: body.name,
      code: body.code,
      grade: body.grade,
      branch_id: body.branch_id ? Number(body.branch_id) : null,
      company_id: body.company_id ? Number(body.company_id) : null,
      description: body.description || null,
      created_by: session.user.id,
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "store.create",
    entityType: "store",
    entityId: store.id,
    afterData: store,
  });
  return NextResponse.json({ store });
}
