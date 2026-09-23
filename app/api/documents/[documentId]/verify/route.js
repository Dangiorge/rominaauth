// path: app/api/documents/[documentId]/verify/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadDocumentFile, hashBuffer } from "@/lib/documentStorage";
import { logAudit } from "@/lib/audit";

export async function POST(req, { params }) {
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

  const currentHash = hashBuffer(buffer);
  const matches = currentHash === document.file_hash;

  // If the hash matches, optionally update the document status in the database
  if (matches && document.status === "PENDING_APPROVAL") {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "APPROVED",
        approved_by: session.user.id,
        approved_at: new Date(),
      },
    });
  }

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: matches ? "document.verify_ok" : "document.verify_TAMPERED",
    entityType: "document",
    entityId: document.id,
    afterData: {
      stored_hash: document.file_hash,
      computed_hash: currentHash,
      matches,
    },
  });

  return NextResponse.json({
    matches,
    stored_hash: document.file_hash,
    computed_hash: currentHash,
  });
}
