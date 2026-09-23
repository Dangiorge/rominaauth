// path: lib/googleDrive.js

import { google } from "googleapis";
import { decrypt } from "./crypto";

// Accepts a bare Drive ID, a /folders/ link, a /file/d/ link, or an ?id= link —
// and always returns just the bare ID. Safe to call on a value that's already bare.
export function extractDriveId(input) {
  if (!input) return null;
  const trimmed = input.trim();

  const pathMatch = trimmed.match(/\/(?:folders|d)\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];

  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];

  return trimmed;
}

export function buildDriveClient({ client_email, private_key, project_id }) {
  const auth = new google.auth.JWT({
    email: client_email,
    key: private_key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
    projectId: project_id,
  });
  return google.drive({ version: "v3", auth });
}

export async function testDriveConnection(config) {
  try {
    const sharedDriveId = extractDriveId(config.shared_drive_id);
    const drive = buildDriveClient({
      client_email: config.client_email,
      private_key: config.privateKeyIsPlaintext
        ? config.private_key
        : decrypt(config.private_key),
      project_id: config.project_id,
    });

    if (sharedDriveId) {
      // Try as a genuine Shared Drive first.
      try {
        const res = await drive.drives.get({
          driveId: sharedDriveId,
          fields: "id, name",
        });
        return {
          success: true,
          message: `Connected. Shared Drive found: "${res.data.name}".`,
        };
      } catch (sharedDriveErr) {
        // Fall back to treating it as a regular folder shared with the service account.
        try {
          const res = await drive.files.get({
            fileId: sharedDriveId,
            fields: "id, name, mimeType",
            supportsAllDrives: true,
          });
          if (res.data.mimeType !== "application/vnd.google-apps.folder") {
            return {
              success: false,
              message: `Found an item named "${res.data.name}", but it's not a folder — point this at a folder or Shared Drive ID.`,
            };
          }
          return {
            success: true,
            message: `Connected. Folder found: "${res.data.name}" (this is a regular shared folder, not a Shared Drive — that's fine, uploads will still work).`,
          };
        } catch (folderErr) {
          const detail =
            folderErr.response?.data?.error?.message || folderErr.message;
          return {
            success: false,
            message: `Not found as a Shared Drive or a folder. Confirm the service account (${config.client_email}) has been granted access, and that the ID is correct. (${detail})`,
          };
        }
      }
    }

    const res = await drive.about.get({ fields: "user" });
    return {
      success: true,
      message: `Connected as ${res.data.user?.emailAddress || config.client_email}.`,
    };
  } catch (err) {
    const detail =
      err.response?.data?.error?.message || err.message || "Unknown error.";
    return { success: false, message: detail };
  }
}
