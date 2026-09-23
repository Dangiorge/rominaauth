// path: app/api/metadata/organization/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch companies using your established ordering/filtering, and active departments
    const [companies, departments] = await Promise.all([
      prisma.company.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      prisma.department.findMany({
        where: { is_active: true },
        select: { id: true, name: true, code: true },
      }),
    ]);

    return NextResponse.json({ companies, departments }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
