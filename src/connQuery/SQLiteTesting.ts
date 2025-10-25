// Drill Set 4 — SQLite for Testing¶
// What you’ll learn:
// SQLite is a lightweight DB you can embed in tests without running Postgres.

import readline from "node:readline";
import initSqlJs, { Database } from "sql.js";
// Install better-sqlite3 or sqlite3. --using sql.js
import { query as pgQuery } from "./db";
import dotenv from "dotenv";
dotenv.config();

interface User {
  id?: number;
  name: string;
  email: string;
}

function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
  };
}

function question(ques: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise<string>((resolve) =>
    rl.question(ques, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

// Swap between SQLite (test) and Postgres (dev/prod) using an environment variable.
async function main() {
  const choice = (await question(
    "Which DB to use? (1 = SQLite test, 2 = Postgres dev/prod): "
  )).trim();

  if (choice === "1") {
    // SQLite Testing
    const SQL = await initSqlJs({ locateFile: (file) => `node_modules/sql.js/dist/${file}` });
// Create an in-memory SQLite database (:memory:). --in place of :memory SQL.Database() is used
    const db = new SQL.Database();
    console.log("Using SQLite in-memory DB for testing");

// Run CREATE TABLE users (...) inside SQLite.
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      );
    `);

// Insert and fetch rows synchronously in tests.
    // Insert users via CLI
    const name = await question("Enter name: ");
    const email = await question("Enter email: ");

    const insertStmt = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
    insertStmt.run([name, email]);
    insertStmt.free();

    console.log(`User '${name}' inserted successfully.`);

    // Fetch all users
    const result = db.exec("SELECT * FROM users");
    if (result.length > 0) {
      const users: User[] = result[0].values.map((row: any[]) => ({
        id: row[0],
        name: row[1],
        email: row[2],
      }));
      console.log("\nSQLite Users:");
      console.table(users);
    }

    db.close();

  } else if (choice === "2") {
    // Postgres
    console.log("Using Postgres DB");

    await pgQuery(`
      CREATE TABLE IF NOT EXISTS users_pg (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      )
    `);

    const name = await question("Enter name: ");
    const email = await question("Enter email: ");

    await pgQuery(
      "INSERT INTO users_pg (name, email) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [name, email]
    );

    const res = await pgQuery("SELECT * FROM users_pg");
    const users: User[] = res.rows.map(mapUser);

    console.log("\nPostgres Users:");
    console.table(users);
  } else {
    console.log("Invalid choice. Enter 1 or 2.");
  }
}

main().catch(console.error);
