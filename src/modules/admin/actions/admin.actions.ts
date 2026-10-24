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
  return run(
    "organization.create",
    organizationSchema,
    raw,
    (actor, input) => createOrganization(actor, input),
    () => ({ targetType: "organization" }),
  );
}

export async function updateOrganizationAction(raw: unknown) {
  return run(
    "organization.update",
    organizationUpdateSchema,
    raw,
    (actor, input) => updateOrganization(actor, input),
    (input) => ({ targetType: "organization", targetId: input.id, organizationId: input.id }),
  );
}

export async function deleteOrganizationAction(raw: unknown) {
  return run(
    "organization.delete",
    z.object({ id: z.string().min(1) }),
    raw,
    (actor, input) => deleteOrganization(actor, input.id),
    (input) => ({ targetType: "organization", targetId: input.id, organizationId: input.id }),
  );
}

export async function addMemberAction(raw: unknown) {
  return run(
    "member.add",
    addMemberSchema,
    raw,
    (actor, input) => addMember(actor, input),
    (input) => ({ targetType: "member", organizationId: input.organizationId }),
  );
}

export async function changeMemberRoleAction(raw: unknown) {
  return run(
    "member.change_role",
    changeRoleSchema,
    raw,
    (actor, input) => changeMemberRole(actor, input.memberId, input.role),
    (input) => ({ targetType: "member", targetId: input.memberId }),
  );
}

export async function removeMemberAction(raw: unknown) {
  return run(
    "member.remove",
    removeMemberSchema,
    raw,
    (actor, input) => removeMember(actor, input.memberId),
    (input) => ({ targetType: "member", targetId: input.memberId }),
  );
}
