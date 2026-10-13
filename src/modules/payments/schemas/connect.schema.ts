import { z } from "zod";

export const connectOrganizationInputSchema = z.object({
  organizationId: z.string().regex(/^org_[0-9a-f-]{36}$/i),
});

export type ConnectOrganizationInput = z.infer<
  typeof connectOrganizationInputSchema
>;
