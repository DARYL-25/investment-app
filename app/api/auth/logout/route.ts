import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/server/auth";
import { handler, ok } from "@/lib/server/api";

export const POST = handler(async () => {
  cookies().delete(SESSION_COOKIE);
  return ok({ loggedOut: true });
});
