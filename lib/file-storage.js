import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || "Z:\\";
const LOCAL_FALLBACK = path.join(process.cwd(), "public", "uploads");

export async function saveUploadedFile(file, subfolder = "ceo") {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // 1. Compute SHA-256 cryptographic hash for tamper detection
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

  const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const relativeDir = path.join(subfolder, new Date().getFullYear().toString());

  let targetRoot = UPLOAD_ROOT;
  let fullTargetDir = path.join(targetRoot, relativeDir);

  // 2. Try writing directly to the Z: drive; fall back locally if Z: is disconnected
  try {
    if (!fs.existsSync(fullTargetDir)) {
      fs.mkdirSync(fullTargetDir, { recursive: true });
    }
  } catch (err) {
    console.error("CRITICAL: Failed to write to Z: drive:", err.message);
    console.warn("Falling back to local storage folder (public/uploads)...");

    targetRoot = LOCAL_FALLBACK;
    fullTargetDir = path.join(targetRoot, relativeDir);
    if (!fs.existsSync(fullTargetDir)) {
      fs.mkdirSync(fullTargetDir, { recursive: true });
    }
  }

  const filePath = path.join(fullTargetDir, safeFileName);
  fs.writeFileSync(filePath, buffer);

  return {
    filePath: path.relative(targetRoot, filePath),
    fileHash,
    fileSize: buffer.length,
    mimeType: file.type || "application/octet-stream",
  };
}
