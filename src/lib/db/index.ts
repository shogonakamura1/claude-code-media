import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type CloudflareEnv = {
  DB: D1Database;
  ADMIN_PASSWORD_HASH: string;
};

export function getDb(env: CloudflareEnv) {
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;
export * from "./schema";
