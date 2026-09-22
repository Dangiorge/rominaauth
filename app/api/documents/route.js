// path: app/api/documents/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadDocumentFile, hashBuffer } from "@/lib/documentStorage";
import { logAudit } from "@/lib/audit";

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documents = await prisma.document.findMany({
    where: { deleted_at: null },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      file_size: true,
      mime_type: true,
      file_hash: true,
      created_at: true,
      company_id: true,
      department: { select: { name: true } },
      category: { select: { name: true } },
      subcategory: { select: { name: true } },
      uploader: { select: { id: true, full_name: true, email: true } },
      approver: { select: { id: true, full_name: true } },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ documents });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const title = formData.get("title");
  const description = formData.get("description");
  const companyId = formData.get("company_id");
  const departmentId = formData.get("department_id");
  const categoryId = formData.get("category_id");
  const subcategoryId = formData.get("subcategory_id");

  if (!file || !title || !companyId) {
    return NextResponse.json(
      { error: "File, title, and company are required." },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File must be under 25MB." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = hashBuffer(buffer);

  let uploadResult;
  try {
    uploadResult = await uploadDocumentFile(buffer, file.name, file.type);
  } catch (err) {
    return NextResponse.json(
      { error: `Google Drive upload failed: ${err.message}` },
      { status: 502 },
    );
  }

  const document = await prisma.document.create({
    data: {
      company_id: Number(companyId),
      title,
      description: description || null,
      file_path: uploadResult.driveFileId,
      file_hash: hash,
      file_size: uploadResult.size,
      mime_type: uploadResult.mimeType,
      category_id: categoryId ? Number(categoryId) : null,
      subcategory_id: subcategoryId ? Number(subcategoryId) : null,
      department_id: departmentId ? Number(departmentId) : null,
      status: "PENDING_APPROVAL",
      uploaded_by: session.user.id,
    },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "document.upload",
    entityType: "document",
    entityId: document.id,
    afterData: {
      title: document.title,
      file_hash: hash,
      file_size: uploadResult.size,
    },
  });

  return NextResponse.json({ document });
}
