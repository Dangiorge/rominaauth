import { prisma } from "./prisma";

function normalizedRole(roleName) {
  return (roleName || "").trim().toLowerCase();
}

export async function getDocumentActor(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      department_id: true,
      role: { select: { id: true, name: true } },
    },
  });
}

export function isCeo(actor) {
  const role = normalizedRole(actor?.role?.name);
  return role === "ceo" || role.includes("chief executive");
}

export function isSuperAdmin(actor) {
  return normalizedRole(actor?.role?.name) === "super_admin";
}

export function canViewDocument(actor, document) {
  if (!actor || !document) return false;
  if (isSuperAdmin(actor) || isCeo(actor)) return true;
  if (document.uploaded_by === actor.id) return true;
  return Boolean(
    actor.department_id &&
      document.department_id &&
      actor.department_id === document.department_id,
  );
}

export function canApproveInitialDocument(actor, document) {
  if (!actor || !document) return false;
  if (isSuperAdmin(actor) || isCeo(actor)) return true;
  return (
    normalizedRole(actor.role?.name).includes("manager") &&
    actor.department_id === document.department_id
  );
}

export function canApproveDocumentEdit(actor) {
  return isSuperAdmin(actor) || isCeo(actor);
}
