export interface OrganizerCandidate {
  id: string;
  email: string;
  organizationIds: string[];
}

export interface OrganizerAssignment {
  email: string;
  organizationId: string;
  created: boolean;
}

export interface AssignOrganizersResult {
  memberships: { userId: string; organizationId: string }[];
  targetOrganizationIds: string[];
  assignments: OrganizerAssignment[];
}

export function pickRandom<T>(items: readonly T[], rng: () => number = Math.random): T {
  if (items.length === 0) throw new Error("No hay elementos entre los cuales elegir");
  return items[Math.min(Math.floor(rng() * items.length), items.length - 1)];
}

/** Los usuarios con membresía se respetan; los que no tienen reciben una nueva (rol organizer) en una organización al azar. */
export function assignOrganizers({
  users,
  organizationIds,
  rng = Math.random,
}: {
  users: OrganizerCandidate[];
  organizationIds: string[];
  rng?: () => number;
}): AssignOrganizersResult {
  const memberships: AssignOrganizersResult["memberships"] = [];
  const assignments: OrganizerAssignment[] = [];
  const targets = new Set<string>();

  for (const user of users) {
    if (user.organizationIds.length > 0) {
      for (const organizationId of user.organizationIds) {
        targets.add(organizationId);
        assignments.push({ email: user.email, organizationId, created: false });
      }
      continue;
    }
    const organizationId = pickRandom(organizationIds, rng);
    memberships.push({ userId: user.id, organizationId });
    targets.add(organizationId);
    assignments.push({ email: user.email, organizationId, created: true });
  }

  return { memberships, targetOrganizationIds: [...targets], assignments };
}
