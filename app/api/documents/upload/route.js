// path: app/api/documents/upload/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserDocumentPermissions } from "@/lib/document-permissions";
import { uploadDocumentFile, hashBuffer } from "@/lib/documentStorage";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const title = formData.get("title");
    const description = formData.get("description");
    const category_id = formData.get("category_id");
    const subcategory_id = formData.get("subcategory_id");
    const department_id = formData.get("department_id");

    if (!file || !category_id || !subcategory_id) {
      return NextResponse.json(
        { error: "File, Category, and Subcategory are required fields." },
        { status: 400 },
      );
    }

    // Validate permissions
    const perms = await getUserDocumentPermissions(
      session.user.id,
      parseInt(category_id),
    );

    const hasSubmitAccess =
      perms?.submit ||
      perms?.access_level === "EDIT" ||
      perms?.access_level === "FULL";

    if (!hasSubmitAccess && session.user.roleName !== "super_admin") {
      return NextResponse.json(
        {
          error:
            "Forbidden: You do not have submission access for this category.",
        },
        { status: 403 },
      );
    }

    // Convert file to ArrayBuffer and create a standard Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Failed to create a valid file buffer from upload.");
    }

    // Compute cryptographic hash of the file buffer
    const file_hash = hashBuffer(buffer);

    // Uploads file to Google Drive and returns the valid file ID
    const storageResult = await uploadDocumentFile(
      buffer,
      file.name,
      file.type || "application/octet-stream",
    );

    const file_path = storageResult.driveFileId;

    let companyId = session.user.company_id || session.user.companyId;
    let resolvedDepartmentId = department_id || session.user.department_id;

    if (!companyId || !resolvedDepartmentId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { userCompanies: { take: 1 } },
      });
      companyId =
        companyId ||
        dbUser?.userCompanies?.[0]?.company_id ||
        dbUser?.company_id;
      resolvedDepartmentId = resolvedDepartmentId || dbUser?.department_id;
    }

    const documentData = {
      title,
      description,
      file_path,
      file_hash, // Save computed hash here so integrity checks pass successfully!
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      status: "PENDING_APPROVAL",
      category: { connect: { id: parseInt(category_id) } },
      subcategory: { connect: { id: parseInt(subcategory_id) } },
      uploader: { connect: { id: session.user.id } },
    };

    if (resolvedDepartmentId) {
      documentData.department = {
        connect: { id: parseInt(resolvedDepartmentId) },
      };
    }

    if (companyId) {
      documentData.company = { connect: { id: parseInt(companyId) } };
    } else {
      const defaultCompany = await prisma.company.findFirst();
      if (defaultCompany) {
        documentData.company = { connect: { id: defaultCompany.id } };
      } else {
        return NextResponse.json(
          { error: "No company association found for this user." },
          { status: 400 },
        );
      }
    }

    const document = await prisma.document.create({
      data: documentData,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
