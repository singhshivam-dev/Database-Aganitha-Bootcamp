// Drill Set 2 — Parameterized Queries¶
// What you’ll learn:


import { pool, query } from './db';

async function main() {
  try {
    // Clean up old table
    await query(`DROP TABLE IF EXISTS users CASCADE`);

    // Create users table
    await query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      )
    `);

// Write a query to insert into users (name, email) with $1, $2 placeholders. --parameterized Query
    const insertText = `INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *`;

// Insert two users using parameters.
    const user1 = await query(insertText, ['Alpha', 'alpha@example.com']);
    const user2 = await query(insertText, ['Beta', 'beta@example.com']);

    console.log('Inserted Users:');
    console.table([user1.rows[0], user2.rows[0]]);

// Write a query to fetch a user by email using parameter binding.
    const emailToFetch = 'alpha@example.com';
    const fetched = await query(`SELECT * FROM users WHERE email = $1`, [emailToFetch]);
    console.log(`\nFetched user by email (${emailToFetch}):`);
    console.table(fetched.rows);

// Try inserting with untrusted input containing ' OR 1=1; -- and confirm it’s escaped safely.
    const unsafeEmail = `' OR 1=1; --`; // changes the meaning of your SQL, returns all rows
    const safeFetch = await query(`SELECT * FROM users WHERE email = $1`, [unsafeEmail]);
    console.log('\nTrying unsafe input:');
    console.table(safeFetch.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    console.log('Pool closed.');
  }
}

main();


// Parameterized queries prevent SQL injection and keep your code safe.

// String concatenation: Combining SQL query strings with variables directly, e.g.,
// const sql = "SELECT * FROM users WHERE email = '" + email + "'";

// Unsafe because user input can break the query and allow SQL injection.
// Parameterized queries: Using placeholders like $1, $2 and passing values separately, e.g.,
// await query("SELECT * FROM users WHERE email = $1", [email]);

// Safe because the database treats inputs as literal values, not code.

// Why parameters are better:
// Prevent SQL injection.
// Automatically escape special characters.
// Cleaner, safer, and easier to maintain.




// Allows attackers to run arbitrary SQL → data leaks, corruption, deletion.
// Hard to escape correctly → escaping manually is error-prone.
// Breaks code readability → concatenating strings with dynamic inputs becomes messy.
// Always use parameterized queries ($1, $2) for any user input.
// Never directly insert untrusted input into SQL strings.