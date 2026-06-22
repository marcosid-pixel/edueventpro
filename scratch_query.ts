import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
  try {
    const result = await turso.execute("SELECT id, displayName, email, role FROM users WHERE displayName LIKE '%ellen%' COLLATE NOCASE OR email LIKE '%ellen%' COLLATE NOCASE;");
    console.log("Users found:", JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
