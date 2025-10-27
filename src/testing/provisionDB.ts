// Drill Set 1 — Provision a DB from nothing¶
// Why: Learn to bring a clean DB online repeatably. Developers often inherit a DB but don’t know how to create it from scratch.

// uuid-ossp --- Generates UUIDs (universally unique identifiers) for primary keys or unique IDs.
// pgcrypto ---	Provides cryptographic functions (e.g., hashing passwords, encryption).

import { execSync } from "child_process";
import { Client } from "pg";
import initSqlJs from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import readline from "node:readline/promises";
import { stdin, stdout } from "process";
import dotenv from "dotenv";

dotenv.config();
async function main() {
  // which DB to provision
  const rl = readline.createInterface({ input: stdin, output: stdout });
  console.log("Select DB to provision:");
  console.log("1. Postgres");
  console.log("2. SQLite (in-memory)");
  console.log("3. Testing mode (SQLite quick check)");

  const choice = await rl.question("Enter 1, 2, or 3: ");
  rl.close();

  const DB_USER = process.env.PG_USER || "postgres";
  const DB_PASS = process.env.PG_PASSWORD || "postgres";
  const DB_NAME = process.env.PG_DATABASE || "dbDrills";
  const DB_HOST = process.env.PG_HOST || "localhost";
  const DB_PORT = process.env.PG_PORT || "5432";

  // SQLite branch
// For SQLite, start :memory: DB.
  if (choice === "2" || choice === "3") {
    console.log("Starting SQLite in-memory(RAM-temp) DB...");
    const SQL = await initSqlJs();
    const sqljsDB = new SQL.Database(); // :memory:
    const db = drizzle(sqljsDB);

// Add a preflight script that fails if DB isn’t reachable.
    sqljsDB.run("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);");
    sqljsDB.run("INSERT INTO test (name) VALUES ('ok');");
    console.log("SQLite preflight result:", sqljsDB.exec("SELECT * FROM test;"));

    sqljsDB.close();
    console.log("SQLite DB closed.");
    return;
  }

  // Postgres branch
// Create a Postgres role + DB via script.
  const DATABASE_URL = `postgresql://${DB_USER}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

  try {
    console.log("Creating Postgres role and database...");

    // Use simple CREATE ROLE if Postgres >= 9.6
    execSync(
      `psql -U postgres -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}'; END IF; END$$;"`,
      { stdio: "inherit", env: { ...process.env, PGPASSWORD: DB_PASS } }
    );

    // Create DB if not exists
    execSync(
      `psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | findstr 1 || psql -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"`,
      { stdio: "inherit", env: { ...process.env, PGPASSWORD: DB_PASS } }
    );

    console.log("Role and database created.");

// Enable required extensions (uuid-ossp, pgcrypto).
    execSync(
      `psql -U postgres -d ${DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS \\"uuid-ossp\\";"`,
      { stdio: "inherit", env: { ...process.env, PGPASSWORD: DB_PASS } }
    );
    execSync(
      `psql -U postgres -d ${DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"`,
      { stdio: "inherit", env: { ...process.env, PGPASSWORD: DB_PASS } }
    );
    console.log("Extensions enabled...");

    // Preflight connectivity
    console.log("Running preflight check...");
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    await client.query("SELECT 1;");
    await client.end();

    console.log("Postgres reachable.");
// Emit a ready DATABASE_URL.
    console.log("DATABASE_URL =", DATABASE_URL);

  } catch (err) {
    console.error("Error during Postgres provisioning:", err);
    process.exit(1);
  }
}

main();
