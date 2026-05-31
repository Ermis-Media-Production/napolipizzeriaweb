import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

// Load env
const envPath = "/home/ubuntu/tradevault/.env";
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  try {
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) dbUrl = match[1].trim();
  } catch {}
}

if (!dbUrl) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const conn = await createConnection(dbUrl);
const [rows] = await conn.execute("SELECT id, open_id, name, email, role, created_at FROM user ORDER BY created_at DESC LIMIT 20");
console.log(JSON.stringify(rows, null, 2));
await conn.end();
