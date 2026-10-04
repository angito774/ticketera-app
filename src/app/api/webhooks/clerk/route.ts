import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

import { fromWebhookUser } from "@/modules/auth/services/clerk-user";
import {
  deleteUser,
  syncRoleMetadata,
  upsertUser,
} from "@/modules/auth/services/user-sync.service";

export async function POST(req: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(req);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const fields = fromWebhookUser(event.data);
      if (fields) {
        await upsertUser(fields);
        if (event.type === "user.created") await syncRoleMetadata(fields.id);
      }
      break;
    }
    case "user.deleted":
      if (event.data.id) await deleteUser(event.data.id);
      break;
  }

  return new Response("ok", { status: 200 });
}
