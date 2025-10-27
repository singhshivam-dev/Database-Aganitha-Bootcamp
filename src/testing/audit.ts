// Drill Set 6 — Audit & failure simulation¶
// Why: Auditing catches bad states early, while failure tests prove resilience.

// Drill Set 6 — Audit & failure simulation
// Why: Auditing catches bad states early, while failure tests prove resilience.

import { Client } from "pg";
import dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config();

const DB_USER = process.env.PG_USER || "postgres";
const DB_PASS = process.env.PG_PASSWORD || "postgres";
const DB_NAME = process.env.PG_DATABASE || "dbDrills";
const DB_HOST = process.env.PG_HOST || "localhost";
const DB_PORT = process.env.PG_PORT || "5432";

const DATABASE_URL = `postgresql://${DB_USER}:${encodeURIComponent(
  DB_PASS
)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

function newClient() {
  return new Client({ connectionString: DATABASE_URL });
}

// Audit checks
async function auditData(client: Client): Promise<number> {
  console.log("🔍 Running audit checks...");
  const issues: string[] = [];

  // Duplicate emails
  const dupRes = await client.query(`
    SELECT email, COUNT(*) AS cnt
    FROM users
    GROUP BY email
    HAVING COUNT(*) > 1;
  `);
  if (dupRes.rowCount && dupRes.rowCount > 0) {
    issues.push(`Duplicate emails found: ${dupRes.rowCount}`);
  }

  // Orphan notes (posts without valid user)
  const orphanRes = await client.query(`
    SELECT COUNT(*) AS orphan_count
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE u.id IS NULL;
  `);
  const orphanCount = Number(orphanRes.rows[0]?.orphan_count || 0);
  if (orphanCount > 0) {
    issues.push(`Found ${orphanCount} orphan notes.`);
  }

  if (issues.length === 0) {
    console.log("No audit issues found.");
    return 0;
  } else {
    console.error("Audit issues detected:\n" + issues.join("\n"));
    return 1;
  }
}

// Simulate unique constraint violation
async function simulateConstraintViolation(client: Client) {
  console.log("Simulating unique constraint violation...");
  try {
    const email = "duplicate@example.com";
    await client.query(`INSERT INTO users (name, email) VALUES ('A', $1)`, [email]);
    await client.query(`INSERT INTO users (name, email) VALUES ('B', $1)`, [email]);
  } catch (err: any) {
    if (err.code === "23505") {
      console.log("Unique constraint triggered → return HTTP 409 Conflict");
    } else {
      console.error("Unexpected DB error", err);
    }
  }
}

// Simulate DB failure (graceful)
async function simulateDBFailure(): Promise<Client> {
  console.log("Simulating DB failure mid-request...");
  const correlationId = randomUUID();

  const tempClient = newClient();
  await tempClient.connect();

  try {
    await tempClient.end(); // simulate DB crash
    await tempClient.query("SELECT 1"); // should fail
  } catch {
    console.log("DB unavailable → return 503 Service Unavailable");
    console.log(`Correlation ID: ${correlationId}`);
  }

  // Reconnect new client to continue other tests
  const newConnectedClient = newClient();
  await newConnectedClient.connect();
  return newConnectedClient;
}

// Transaction rollback
async function simulateRollback(client: Client) {
  console.log("Testing transaction rollback...");
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO users (name, email) VALUES ('TempUser', 'temp@example.com')`
    );
    throw new Error("Simulated failure during transaction");
  } catch {
    await client.query("ROLLBACK");
    console.log("Transaction rolled back, no partial writes.");
  }
}

async function main() {
  const baseClient = newClient();
  await baseClient.connect();

  const auditCode = await auditData(baseClient);
  await simulateConstraintViolation(baseClient);

  // DB failure test (uses temporary client internally)
  const healthyClient = await simulateDBFailure();

  // Rollback test uses the *healthy reconnected* client
  await simulateRollback(healthyClient);

  await healthyClient.end();
  await baseClient.end();
  process.exit(auditCode);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});


// pnpm run db:audit
// working