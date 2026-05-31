import { createConnection } from "mysql2/promise";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL env not set");
  process.exit(1);
}

const conn = await createConnection(dbUrl);

const action = process.argv[2] || "show-tables";

if (action === "show-tables") {
  const [rows] = await conn.execute("SHOW TABLES");
  console.log("Tables:", JSON.stringify(rows, null, 2));
} else if (action === "list-users") {
  const [cols] = await conn.execute("DESCRIBE users");
  console.log("Columns:", cols.map(c => c.Field).join(", "));
  const [rows] = await conn.execute("SELECT * FROM users ORDER BY createdAt DESC LIMIT 20");
  console.log(JSON.stringify(rows, null, 2));
} else if (action === "promote") {
  const openId = process.argv[3];
  if (!openId) { console.error("Usage: node db-admin.mjs promote <open_id>"); process.exit(1); }
  const [result] = await conn.execute("UPDATE users SET role='admin' WHERE openId=?", [openId]);
  console.log("Updated rows:", result.affectedRows);
} else if (action === "promote-all") {
  // Promote all users to admin
  const [result] = await conn.execute("UPDATE users SET role='admin' WHERE 1=1");
  console.log("Updated rows:", result.affectedRows);
}

await conn.end();
