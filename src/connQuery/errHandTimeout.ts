// Drill Set 5 — Error Handling & Timeouts¶
// What you’ll learn:
// Connections and queries can fail — you must handle them.

import { query, pool } from "../connQuery/db";

interface User {
  id?: number;
  name: string;
}

// Wrap queries in try/catch and rethrow with context.
async function safeQuery(text: string, params?: any[]) {
  try {
    return await query(text, params);
  } catch (err: any) {
// Log query text + parameters when errors occur.
    console.error("Error executing query:", text);
    console.error("Params:", params);
    console.error("Error message:", err.message);
    throw err; // rethrow
  }
}

// Simulate DB down (wrong port) and catch error.
async function main() {
  try {
    console.log("Testing DB connection...");
    await safeQuery("SELECT NOW()");
    console.log("Connected to DB");

// Add a query timeout using statement_timeout in Postgres.
    await safeQuery("SET statement_timeout = 2000");

    // Create table
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);

    // Insert sample users
    await safeQuery("INSERT INTO users (name) VALUES ($1) ON CONFLICT DO NOTHING", ["Alice"]);
    await safeQuery("INSERT INTO users (name) VALUES ($1) ON CONFLICT DO NOTHING", ["Bob"]);

    // Simulate a long-running query to test timeout
    try {
      console.log("Running long query to test timeout...");
      await safeQuery("SELECT pg_sleep(5)"); // 5 seconds sleep
    } catch (err: any) {
      console.error("Query timeout caught:", err.message);
    }

    // Fetch all users
    const res = await safeQuery("SELECT * FROM users");
    const users: User[] = res.rows;
    console.log("Users:");
    console.table(users);

  } catch (err: any) {
    console.error("Main drill error:", err.message);
  }
}

// Ensure DB pool is closed on process exit (graceful shutdown)
async function shutdown() {
  console.log("Closing DB pool...");
  await pool.end();
  process.exit(0);
}

// Catch termination signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", async () => {
  await pool.end();
  console.log("Pool closed on exit");
});

main();
