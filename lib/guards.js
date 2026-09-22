// path: lib/guards.js

import { prisma } from "./prisma";

export async function canDeleteRole(roleId) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return { allowed: false, reason: "Role not found." };
  if (role.is_system)
    return {
      allowed: false,
      reason: `"${role.name}" is a protected system role and cannot be deleted.`,
    };

  const count = await prisma.user.count({
    where: { role_id: roleId, deleted_at: null },
  });
  if (count > 0) {
    return {
      allowed: false,
      reason: `Cannot delete: ${count} user(s) are currently assigned to this role. Reassign them first.`,
    };
  }
  return { allowed: true };
}

export async function canDeletePath(pathId) {
  const permCount = await prisma.rolePermission.count({
    where: {
      path_id: pathId,
      OR: [
        { can_view: true },
        { can_create: true },
        { can_edit: true },
        { can_delete: true },
      ],
    },
  });
  if (permCount > 0) {
    return {
      allowed: false,
      reason: `Cannot delete: ${permCount} role permission grant(s) reference this path. Revoke them first.`,
    };
  }

  const childCount = await prisma.registeredPath.count({
    where: { parent_id: pathId },
  });
  if (childCount > 0) {
    return {
      allowed: false,
      reason: `Cannot delete: ${childCount} sub-path(s) depend on this path.`,
    };
  }
  return { allowed: true };
}

export async function canRemoveUser(targetUserId, actingUserId) {
  if (targetUserId === actingUserId) {
    return {
      allowed: false,
      reason: "You cannot delete or deactivate your own account.",
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { role: true },
  });
  if (!target) return { allowed: false, reason: "User not found." };

  if (target.role?.name === "super_admin") {
    const count = await prisma.user.count({
      where: {
        role: { name: "super_admin" },
        is_active: true,
        deleted_at: null,
      },
    });
    if (count <= 1) {
      return {
        allowed: false,
        reason:
          "Cannot remove the last active super_admin. Promote another user first.",
      };
    }
  }
  return { allowed: true };
}
