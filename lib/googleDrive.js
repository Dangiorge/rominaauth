// path: lib/googleDrive.js

import { google } from "googleapis";
import { decrypt } from "./crypto";

function folderIdFromUrl(value) {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/folders\/([^/?]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function buildDriveClient({ client_email, private_key, project_id }) {
  const auth = new google.auth.JWT({
    email: client_email,
    key: private_key.replace(/\\n/g, "\n"), // handles keys pasted with literal \n sequences
    scopes: ["https://www.googleapis.com/auth/drive"],
    projectId: project_id,
  });
  return google.drive({ version: "v3", auth });
}

export async function testDriveConnection(config) {
  try {
    const drive = buildDriveClient({
      ...config,
      private_key: config.privateKeyIsPlaintext
        ? config.private_key
        : decrypt(config.private_key),
    });

    if (config.shared_drive_id) {
      const folderId = folderIdFromUrl(config.shared_drive_id);

      if (folderId) {
        const res = await drive.files.get({
          fileId: folderId,
          fields: "id, name, mimeType, driveId",
          supportsAllDrives: true,
        });

        if (res.data.mimeType !== "application/vnd.google-apps.folder") {
          return {
            success: false,
            message: "The supplied URL points to a file, not a Google Drive folder.",
          };
        }

        return {
          success: true,
          message: `Connected. Destination folder found: "${res.data.name}".`,
          folder_id: res.data.id,
          drive_id: res.data.driveId || null,
        };
      }

      const res = await drive.drives.get({
        driveId: config.shared_drive_id,
        fields: "id, name",
        supportsAllDrives: true,
      });
      return {
        success: true,
        message: `Connected. Shared Drive found: "${res.data.name}".`,
      };
    }

    const res = await drive.about.get({ fields: "user" });
    return {
      success: true,
      message: `Connected as ${res.data.user?.emailAddress || config.client_email}.`,
    };
  } catch (err) {
    const detail =
      err.response?.data?.error?.message || err.message || "Unknown error.";
    const message =
      err.code === 404 || err.response?.status === 404
        ? "Google could not find this Drive or folder for the service account. Share the folder with the service-account email, then test again."
        : detail;
    return { success: false, message };
  }
}
