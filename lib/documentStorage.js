// path: lib/documentStorage.js

import { Readable } from "stream";
import crypto from "crypto";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";
import { buildDriveClient, extractDriveId } from "./googleDrive";

async function getActiveDriveClient() {
  const config = await prisma.googleDriveConfig.findFirst({
    orderBy: { id: "desc" },
  });
  if (!config)
    throw new Error(
      "Google Drive is not configured yet. Set it up under Settings first.",
    );

  const drive = buildDriveClient({
    client_email: config.client_email,
    private_key: decrypt(config.private_key),
    project_id: config.project_id,
  });

  return { drive, sharedDriveId: extractDriveId(config.shared_drive_id) };
}

export function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function uploadDocumentFile(buffer, filename, mimeType) {
  const { drive, sharedDriveId } = await getActiveDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      ...(sharedDriveId && { parents: [sharedDriveId] }),
    },
    media: {
      mimeType: mimeType || "application/octet-stream",
      body: Readable.from(buffer),
    },
    fields: "id, name, size, mimeType",
    supportsAllDrives: true,
  });

  return {
    driveFileId: res.data.id,
    size: Number(res.data.size || buffer.length),
    mimeType: res.data.mimeType || mimeType,
  };
}

export async function downloadDocumentFile(driveFileId) {
  const { drive } = await getActiveDriveClient();
  const res = await drive.files.get(
    { fileId: driveFileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(res.data);
}

export async function deleteDocumentFile(driveFileId) {
  const { drive } = await getActiveDriveClient();
  await drive.files.delete({ fileId: driveFileId, supportsAllDrives: true });
}
