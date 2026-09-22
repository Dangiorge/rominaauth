"use server";

import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/file-storage";
import { revalidatePath } from "next/cache";

export async function uploadDocumentAction(formData) {
  try {
    const file = formData.get("file");
    const title = formData.get("title");
    const companyId = parseInt(formData.get("company_id"), 10);
    const departmentId = formData.get("department_id")
      ? parseInt(formData.get("department_id"), 10)
      : null;

    if (!file || !title || !companyId) {
      return {
        success: false,
        error:
          "Please provide a document title, select a company, and choose a file.",
      };
    }

    // Automatically assign the first available system user as the uploader to prevent UUID mismatch errors
    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      return {
        success: false,
        error: "No user found in database to link as uploader.",
      };
    }
    const uploadedBy = defaultUser.id;

    // 1. Save file (tries network share first, falls back locally if needed)
    const fileMeta = await saveUploadedFile(file, `company_${companyId}`);

    // 2. Save Document record & Version 1 inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      const newDoc = await tx.document.create({
        data: {
          company_id: companyId,
          title,
          file_path: fileMeta.filePath,
          file_hash: fileMeta.fileHash,
          file_size: fileMeta.fileSize,
          mime_type: fileMeta.mimeType,
          status: "PENDING_APPROVAL",
          department_id: departmentId,
          uploaded_by: uploadedBy,
        },
      });

      await tx.documentVersion.create({
        data: {
          document_id: newDoc.id,
          version_number: 1,
          file_path: fileMeta.filePath,
          file_hash: fileMeta.fileHash,
          change_reason: "Initial document upload",
          changed_by: uploadedBy,
        },
      });

      return newDoc;
    });

    revalidatePath("/documents");
    return { success: true, documentId: result.id };
  } catch (error) {
    console.error("Error uploading document:", error);
    return {
      success: false,
      error: error.message || "Internal server error during upload.",
    };
  }
}
