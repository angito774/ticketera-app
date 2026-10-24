"use server";

import { run } from "@/modules/admin/actions/run-action";
import {
  roleCreateSchema,
  roleDeleteSchema,
  roleUpdateSchema,
} from "@/modules/admin/schemas/role.schema";
import {
  createRole,
  deleteRole,
  updateRole,
} from "@/modules/admin/services/role.service";

export async function createRoleAction(raw: unknown) {
  return run(
    "role.create",
    roleCreateSchema,
    raw,
    (actor, input) => createRole(actor, input),
    (input) => ({ targetType: "role", targetId: input.id }),
  );
}

export async function updateRoleAction(raw: unknown) {
  return run(
    "role.update",
    roleUpdateSchema,
    raw,
    (actor, input) => updateRole(actor, input),
    (input) => ({ targetType: "role", targetId: input.id }),
  );
}

export async function deleteRoleAction(raw: unknown) {
  return run(
    "role.delete",
    roleDeleteSchema,
    raw,
    (actor, input) => deleteRole(actor, input.id),
    (input) => ({ targetType: "role", targetId: input.id }),
  );
}
