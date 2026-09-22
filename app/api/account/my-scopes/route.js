// path: app/api/account/my-scopes/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGlobalAdmin } from "@/lib/dataScope";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isGlobalAdmin(session)) {
    return NextResponse.json({ isGlobal: true, brands: [], branches: [] });
  }

  const scopes = session.user.scopes || {};

  const [brands, branches] = await Promise.all([
    scopes.brandIds?.length
      ? prisma.brand.findMany({
          where: { id: { in: scopes.brandIds } },
          select: { id: true, name: true, company_id: true },
        })
      : Promise.resolve([]),
    scopes.branchIds?.length
      ? prisma.branch.findMany({
          where: { id: { in: scopes.branchIds } },
          select: { id: true, name: true, brand_id: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ isGlobal: false, brands, branches });
}
