// path: app/api/documents/access-policies/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// GET all access policies
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const policies = await prisma.documentAccessPolicy.findMany({
      include: {
        category: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json({ policies });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// CREATE or UPDATE policy (UPSERT rule per role & category)
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { company_id, category_id, role_id, access_level, permissions } =
      body;

    if (!company_id || !role_id) {
      return NextResponse.json(
        { error: "Company and Role are required." },
        { status: 400 },
      );
    }

    // Check if policy already exists for this role + category + company combination
    const existing = await prisma.documentAccessPolicy.findFirst({
      where: {
        company_id: parseInt(company_id),
        category_id: category_id ? parseInt(category_id) : null,
        role_id: parseInt(role_id),
      },
    });

    let policy;
    if (existing) {
      policy = await prisma.documentAccessPolicy.update({
        where: { id: existing.id },
        data: {
          access_level: access_level || "VIEW",
          permissions: permissions || {},
        },
      });
    } else {
      policy = await prisma.documentAccessPolicy.create({
        data: {
          company_id: parseInt(company_id),
          category_id: category_id ? parseInt(category_id) : null,
          role_id: parseInt(role_id),
          access_level: access_level || "VIEW",
          permissions: permissions || {},
        },
      });
    }

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "document_access_policy.save",
      entityType: "document_access_policy",
      entityId: policy.id,
      afterData: policy,
    });

    return NextResponse.json({ policy });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE policy
export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id)
    return NextResponse.json({ error: "Policy ID required" }, { status: 400 });

  try {
    await prisma.documentAccessPolicy.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      message: "Access policy deleted.",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
