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
  return run(roleCreateSchema, raw, (actor, input) => createRole(actor, input));
}

export async function updateRoleAction(raw: unknown) {
  return run(roleUpdateSchema, raw, (actor, input) => updateRole(actor, input));
}

export async function deleteRoleAction(raw: unknown) {
  return run(roleDeleteSchema, raw, (actor, input) => deleteRole(actor, input.id));
}
