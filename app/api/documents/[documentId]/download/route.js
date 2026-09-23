// path: app/api/documents/[documentId]/download/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadDocumentFile } from "@/lib/documentStorage";
import { logAudit } from "@/lib/audit";

// Helper to map MIME types to correct file extensions
function getExtensionFromMimeType(mimeType) {
  const mimeMap = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
    "application/msword": ".doc",
    "application/vnd.ms-excel": ".xls",
    "image/jpeg": ".jpg",
    "image/png": ".png",
  };
  return mimeMap[mimeType] || "";
}

export async function GET(req, { params }) {
  const { documentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });
  if (!document)
    return NextResponse.json({ error: "Document not found." }, { status: 404 });

  let buffer;
  try {
    buffer = await downloadDocumentFile(document.file_path);
  } catch (err) {
    return NextResponse.json(
      { error: `Could not retrieve file from Google Drive: ${err.message}` },
      { status: 502 },
    );
  }

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "document.download",
    entityType: "document",
    entityId: document.id,
  });

  // Clean the title and construct the filename with extension
  let filename = document.title
    ? document.title.trim().replace(/"/g, "")
    : "downloaded-file";
  const extension = getExtensionFromMimeType(document.mime_type);

  // Append extension automatically only if the title doesn't already have it
  if (extension && !filename.toLowerCase().endsWith(extension.toLowerCase())) {
    filename += extension;
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": document.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
