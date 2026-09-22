// path: app/api/system/audit-logs/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = 25;
  const entityType = searchParams.get("entityType");
  const actorEmail = searchParams.get("actorEmail");

  const where = {
    ...(entityType && { entity_type: entityType }),
    ...(actorEmail && {
      actor_email: { contains: actorEmail, mode: "insensitive" },
    }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // BigInt IDs can't be JSON-serialized directly — converted to Number here.
  const serialized = logs.map((log) => ({ ...log, id: Number(log.id) }));

  return NextResponse.json({ logs: serialized, total, page, pageSize });
}
