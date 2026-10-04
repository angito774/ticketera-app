"use server";

import { z } from "zod";

import { run } from "@/modules/admin/actions/run-action";
import {
  addMemberSchema,
  changeRoleSchema,
  removeMemberSchema,
} from "@/modules/admin/schemas/admin.schema";
import {
  organizationSchema,
  organizationUpdateSchema,
} from "@/modules/admin/schemas/organization.schema";
import {
  deleteOrganization,
  updateOrganization,
} from "@/modules/admin/services/organization-catalog.service";
import {
  addMember,
  changeMemberRole,
  createOrganization,
  removeMember,
} from "@/modules/admin/services/admin.service";

export type { ActionResult } from "@/modules/admin/actions/run-action";

export async function createOrganizationAction(raw: unknown) {
  return run(organizationSchema, raw, (actor, input) =>
    createOrganization(actor, input),
  );
}

export async function updateOrganizationAction(raw: unknown) {
  return run(organizationUpdateSchema, raw, (actor, input) =>
    updateOrganization(actor, input),
  );
}

export async function deleteOrganizationAction(raw: unknown) {
  return run(z.object({ id: z.string().min(1) }), raw, (actor, input) =>
    deleteOrganization(actor, input.id),
  );
}

export async function addMemberAction(raw: unknown) {
  return run(addMemberSchema, raw, (actor, input) => addMember(actor, input));
}

export async function changeMemberRoleAction(raw: unknown) {
  return run(changeRoleSchema, raw, (actor, input) =>
    changeMemberRole(actor, input.memberId, input.role),
  );
}

export async function removeMemberAction(raw: unknown) {
  return run(removeMemberSchema, raw, (actor, input) =>
    removeMember(actor, input.memberId),
  );
}
