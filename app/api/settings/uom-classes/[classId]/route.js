// path: app/api/settings/uom-classes/[classId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteUomClass } from "@/lib/itemGuards";
import { logAudit } from "@/lib/audit";

// GET /api/settings/uom-classes/[classId]
export async function GET(req, { params }) {
  try {
    const { classId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await prisma.uomClass.findUnique({
      where: { id: classId },
    });

    if (!data || data.deleted_at !== null) {
      return NextResponse.json(
        { error: "UOM Class not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error(
      "Unexpected error GET /api/settings/uom-classes/[classId]:",
      err,
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PUT /api/settings/uom-classes/[classId]
export async function PUT(req, { params }) {
  try {
    const { classId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.roleName !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description } = body;

    const existing = await prisma.uomClass.findUnique({
      where: { id: classId },
    });

    if (!existing || existing.deleted_at !== null) {
      return NextResponse.json(
        { error: "UOM Class not found." },
        { status: 404 },
      );
    }

    // Check duplicate name within the same company if name is changing
    if (name && name.trim() !== existing.name) {
      const dup = await prisma.uomClass.findFirst({
        where: {
          company_id: existing.company_id,
          name: name.trim(),
          NOT: { id: classId },
          deleted_at: null,
        },
        select: { id: true },
      });

      if (dup) {
        return NextResponse.json(
          { error: `UOM Class '${name}' already exists for this company.` },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.uomClass.update({
      where: { id: classId },
      data: {
        name: name ? name.trim() : existing.name,
        description:
          description !== undefined
            ? description
              ? description.trim()
              : null
            : existing.description,
        updated_at: new Date(),
        updated_by: session.user.id || null,
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "uom_class.update",
      entityType: "uom_class",
      entityId: classId,
      beforeData: existing,
      afterData: updated,
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    console.error(
      "Unexpected error PUT /api/settings/uom-classes/[classId]:",
      err,
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE /api/settings/uom-classes/[classId] (Soft Delete)
export async function DELETE(req, { params }) {
  try {
    const { classId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.roleName !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ensure UOM Class exists and isn't already deleted
    const existing = await prisma.uomClass.findUnique({
      where: { id: classId },
    });

    if (!existing || existing.deleted_at !== null) {
      return NextResponse.json(
        { error: "UOM Class not found." },
        { status: 404 },
      );
    }

    const guard = await canDeleteUomClass(classId);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason }, { status: 409 });
    }

    // Perform soft delete
    await prisma.uomClass.update({
      where: { id: classId },
      data: {
        deleted_at: new Date(),
        updated_by: session.user.id || null,
      },
    });

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "uom_class.delete",
      entityType: "uom_class",
      entityId: classId,
    });

    return NextResponse.json(
      { success: true, message: "UOM Class deleted successfully." },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "Unexpected error DELETE /api/settings/uom-classes/[classId]:",
      err,
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
