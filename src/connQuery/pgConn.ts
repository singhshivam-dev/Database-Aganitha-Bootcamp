// Drill Set 1 — Connecting to Postgres¶
// What you’ll learn:
// How to establish a connection, run your first query, and close cleanly.


// Install pg package in your Node project.
// pnpm add pg
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    
    // Use Pool from pg to connect with environment variables.
    const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: Number(process.env.PG_PORT),
  });

  try {
// Run a query SELECT NOW() and print the result.
    const res = await pool.query('SELECT NOW()');
    console.log('Current time in Postgres:', res.rows[0]);
  } catch (err) {
    console.error('Error connecting to Postgres:', err);
  } finally {
// Close the pool with pool.end().
    await pool.end();
    console.log('Closed the pool');
    
  }
}

main();

// Wrap connection in a helper module db.ts for reuse.
// See src/connQuery/db.ts for an example.