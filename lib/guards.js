// path: lib/guards.js
// Centralized "is this safe to do" checks — the error-proofing layer.

import { supabaseAdmin } from "./supabase";

// Can this role be deleted? No, if it's a system role or has any users assigned.
export async function canDeleteRole(roleId) {
  const { data: role, error: roleErr } = await supabaseAdmin
    .from("roles")
    .select("id, name, is_system")
    .eq("id", roleId)
    .single();

  if (roleErr || !role) return { allowed: false, reason: "Role not found." };
  if (role.is_system)
    return {
      allowed: false,
      reason: `"${role.name}" is a protected system role and cannot be deleted.`,
    };

  const { count, error: countErr } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId)
    .is("deleted_at", null);

  if (countErr)
    return { allowed: false, reason: "Could not verify role usage." };
  if (count > 0) {
    return {
      allowed: false,
      reason: `Cannot delete: ${count} user(s) are currently assigned to this role. Reassign them first.`,
    };
  }

  return { allowed: true };
}

// Can this path be deleted? No, if any role currently has permissions on it or it has children.
export async function canDeletePath(pathId) {
  const { count: permCount, error: permErr } = await supabaseAdmin
    .from("role_permissions")
    .select("id", { count: "exact", head: true })
    .eq("path_id", pathId)
    .or(
      "can_view.eq.true,can_create.eq.true,can_edit.eq.true,can_delete.eq.true",
    );

  if (permErr)
    return { allowed: false, reason: "Could not verify path usage." };
  if (permCount > 0) {
    return {
      allowed: false,
      reason: `Cannot delete: ${permCount} role permission grant(s) reference this path. Revoke them first.`,
    };
  }

  const { count: childCount, error: childErr } = await supabaseAdmin
    .from("registered_paths")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", pathId);

  if (childErr)
    return { allowed: false, reason: "Could not verify child paths." };
  if (childCount > 0) {
    return {
      allowed: false,
      reason: `Cannot delete: ${childCount} sub-path(s) depend on this path.`,
    };
  }

  return { allowed: true };
}

// Can this user be deleted/deactivated? No, if it's the last active super_admin, or if it's yourself.
export async function canRemoveUser(targetUserId, actingUserId) {
  if (targetUserId === actingUserId) {
    return {
      allowed: false,
      reason: "You cannot delete or deactivate your own account.",
    };
  }

  const { data: target, error: targetErr } = await supabaseAdmin
    .from("users")
    .select("id, role_id, roles ( name )")
    .eq("id", targetUserId)
    .single();

  if (targetErr || !target)
    return { allowed: false, reason: "User not found." };

  if (target.roles?.name === "super_admin") {
    const { count, error: countErr } = await supabaseAdmin
      .from("users")
      .select("id, roles!inner(name)", { count: "exact", head: true })
      .eq("roles.name", "super_admin")
      .eq("is_active", true)
      .is("deleted_at", null);

    if (countErr)
      return { allowed: false, reason: "Could not verify super admin count." };
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
