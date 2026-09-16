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

  const where = {};
  if (entityType) where.entity_type = entityType;
  if (actorEmail)
    where.actor_email = { contains: actorEmail, mode: "insensitive" };

  try {
    const [data, count] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs: data, total: count, page, pageSize });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
