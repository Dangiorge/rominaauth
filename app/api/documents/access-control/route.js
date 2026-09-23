// path: app/api/documents/access-control/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch all access control policies for the company
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const policies = await prisma.documentAccessPolicy.findMany({
      where: { company_id: session.user.company_id },
      include: {
        role: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        document: { select: { id: true, title: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ policies });
  } catch (error) {
    console.error("GET policies error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new access policy rule
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      role_id,
      category_id,
      department_id,
      document_id,
      access_level,
      permissions,
    } = body;

    const newPolicy = await prisma.documentAccessPolicy.create({
      data: {
        company_id: session.user.company_id,
        role_id: parseInt(role_id),
        category_id: category_id ? parseInt(category_id) : null,
        department_id: department_id ? parseInt(department_id) : null,
        document_id: document_id || null,
        access_level: access_level || "CUSTOM",
        permissions: permissions || {
          view: false,
          submit: false,
          approve: false,
          check: false,
          request_edit: false,
          approve_edit: false,
          view_type: "STANDARD",
        },
      },
    });

    return NextResponse.json({ policy: newPolicy }, { status: 201 });
  } catch (error) {
    console.error("POST policy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing access policy rule
export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      id,
      role_id,
      category_id,
      department_id,
      document_id,
      access_level,
      permissions,
    } = body;

    const updated = await prisma.documentAccessPolicy.update({
      where: { id },
      data: {
        role_id: parseInt(role_id),
        category_id: category_id ? parseInt(category_id) : null,
        department_id: department_id ? parseInt(department_id) : null,
        document_id: document_id || null,
        access_level: access_level || "CUSTOM",
        permissions,
      },
    });

    return NextResponse.json({ policy: updated });
  } catch (error) {
    console.error("PUT policy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove an access control policy
export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json(
        { error: "Policy ID required" },
        { status: 400 },
      );

    await prisma.documentAccessPolicy.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE policy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
