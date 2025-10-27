// Drill Set 2 — Apply schema the right way¶
// Why: Schema must be versioned and reproducible, not ad-hoc. This prevents drift between environments.

import { execSync } from "child_process";
import { Client } from "pg";
import initSqlJs from "sql.js";
import { drizzle, SQLJsDatabase } from "drizzle-orm/sql-js";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import readline from "node:readline/promises";
import { stdin, stdout } from "process";
import dotenv from "dotenv";

dotenv.config();

// Drizzle schema (optional for queries)
const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});

const posts = sqliteTable("posts", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: integer("author_id").notNull(),
});

const schema = { users, posts };

// Conditional migration SQL
// Run same migrations on SQLite.
const SQLITE_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    author_id INTEGER NOT NULL,
    FOREIGN KEY(author_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO schema_version(version) VALUES (1);
`;
// Add a schema version table.

// Run migrations on Postgres.
const POSTGRES_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    author_id INTEGER NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO schema_version(version) VALUES (1) ON CONFLICT DO NOTHING;
`;
// Add a schema version table.

const EXPECTED_VERSION = 1;

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  console.log("Select DB to provision:");
  console.log("1. Postgres");
  console.log("2. SQLite (in-memory)");
  console.log("3. Testing mode (SQLite quick check)");
  const choice = await rl.question("Enter 1, 2, or 3: ");
  rl.close();

  const DB_USER = process.env.PG_USER || "postgres";
  const DB_PASS = process.env.PG_PASSWORD || "postgres@132k4";
  const DB_NAME = process.env.PG_DATABASE || "dbDrills";
  const DB_HOST = process.env.PG_HOST || "localhost";
  const DB_PORT = process.env.PG_PORT || "5432";

  // SQLite branch
  if (choice === "2" || choice === "3") {
    console.log("Starting SQLite in-memory DB...");
    const SQL = await initSqlJs();
    const sqljsDB = new SQL.Database();
    const db: SQLJsDatabase<typeof schema> = drizzle(sqljsDB, { schema });

    sqljsDB.run(SQLITE_SQL);
    console.log("- SQLite migration applied.");

// Fail fast if versions mismatch.
    const versionResult = sqljsDB.exec("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1;");
    const currentVersion = versionResult[0]?.values?.[0]?.[0];
    if (currentVersion !== EXPECTED_VERSION) throw new Error(`Schema version mismatch: expected ${EXPECTED_VERSION}, got ${currentVersion}`);
    console.log("- Schema version is correct.");

    sqljsDB.run("INSERT INTO users (name, email) VALUES ('TestUser', 'test@example.com');");
    console.log("- Preflight test passed:", sqljsDB.exec("SELECT id, name FROM users;"));
    sqljsDB.close();
    console.log("SQLite DB closed.");
    return;
  }

  // Postgres branch
  const DATABASE_URL = `postgresql://${DB_USER}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

  try {
    console.log("Creating Postgres role and database...");
    execSync(
      `psql -U postgres -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname='${DB_USER}') THEN CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}'; END IF; END$$;"`,
      { stdio: "inherit", env: { ...process.env, PGPASSWORD: DB_PASS } }
    );
    execSync(
      `psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | findstr 1 || psql -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"`,
      { stdio: "inherit", env: { ...process.env, PGPASSWORD: DB_PASS } }
    );

    console.log("- Role and database created.");
    execSync(`psql -U postgres -d ${DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS \\"uuid-ossp\\";"`, { stdio: "inherit", env: { ...process.env, PGPASSWORD: DB_PASS } });
    execSync(`psql -U postgres -d ${DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"`, { stdio: "inherit", env: { ...process.env, PGPASSWORD: DB_PASS } });
    console.log("- Extensions enabled.");

    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    await client.query(POSTGRES_SQL);
    console.log("- Postgres migration applied.");

// Fail fast if versions mismatch.
    const res = await client.query("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1;");
    const currentVersion = res.rows[0]?.version;
    if (currentVersion !== EXPECTED_VERSION) throw new Error(`Schema version mismatch: expected ${EXPECTED_VERSION}, got ${currentVersion}`);
    console.log("- Schema version is correct.");

    await client.query("INSERT INTO users (name, email) VALUES ('TestUser', 'test@example.com');");
    const testRes = await client.query("SELECT id, name FROM users;");
    console.log("- Preflight test passed:", testRes.rows);

    await client.end();
    console.log("Postgres provisioning + migration complete.");
    console.log("DATABASE_URL =", DATABASE_URL);

  } catch (err) {
    console.error("Error during Postgres provisioning/migration:", err);
    process.exit(1);
  }
}

main();

// Document the one command to rebuild DB locally
// pnpm ts-node src/testing/applySchema.ts