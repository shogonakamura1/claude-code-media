import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type CloudflareEnv = {
  DB: D1Database;
  ADMIN_PASSWORD_HASH: string;
  GSC_CLIENT_EMAIL?: string;
  GSC_PRIVATE_KEY?: string;
  GSC_SITE_URL?: string;
};

export function getDb(env: CloudflareEnv) {
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;
export * from "./schema";
