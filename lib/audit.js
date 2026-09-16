// path: lib/audit.js

import { prisma } from "./prisma";

export async function logAudit({
  actorId,
  actorEmail,
  action,
  entityType,
  entityId,
  beforeData,
  afterData,
  ipAddress,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actor_id: actorId || null,
        actor_email: actorEmail || null,
        action,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        before_data: beforeData || null,
        after_data: afterData || null,
        ip_address: ipAddress || null,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
}
