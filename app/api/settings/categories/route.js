// path: app/api/settings/categories/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateCategoryPayload } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  const categories = await prisma.itemCategory.findMany({
    where: {
      deleted_at: null,
      ...(companyId && { company_id: Number(companyId) }),
    },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ categories });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();

  let parentCategory = null;
  if (body.parent_id)
    parentCategory = await prisma.itemCategory.findUnique({
      where: { id: body.parent_id },
    });

  const { valid, errors } = validateCategoryPayload(body, parentCategory);
  if (!valid)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const existing = await prisma.itemCategory.findUnique({
    where: { code: body.code },
  });
  if (existing)
    return NextResponse.json(
      { error: "A category with this code already exists." },
      { status: 409 },
    );

  const category = await prisma.itemCategory.create({
    data: {
      company_id: body.company_id,
      name: body.name,
      code: body.code,
      level: body.level,
      parent_id: body.parent_id || null,
      created_by: session.user.id,
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "category.create",
    entityType: "item_category",
    entityId: category.id,
    afterData: category,
  });
  return NextResponse.json({ category });
}
