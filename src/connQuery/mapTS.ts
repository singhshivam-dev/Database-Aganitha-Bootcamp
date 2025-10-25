// Drill Set 3 — Mapping to TypeScript¶
// What you’ll learn:
// Your queries should map directly into TypeScript objects for consistency.

import readline from "node:readline";
import { query } from "./db";
import dotenv from "dotenv";
import { resolve } from "node:path";
dotenv.config();

// Define interface User { id: number; name: string; email: string }.
interface User {
    id?: number;
    name: string;
    email: string;
}

// Write a helper mapUser(row: any): User.
function mapUser(row: any): User {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
    };
}

// Creating a new users table for demonstration
async function createUsersTable() {
    await query(
        `CREATE TABLE IF NOT EXISTS users89 (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
        )`
    )

// To insert a user via POSTGRES CLI/GUI
// INSERT INTO users89 (name, email) VALUES ('Alice', 'alice@example.com') ON CONFLICT (email) DO NOTHING;

// Inserting user via Terminal input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

function question(ques: string){
    return new Promise((res)=> rl.question(ques, res));
}

const name = await question("Enter name: ");
const email = await question("Enter email: ");

    await query(
        `INSERT INTO users89 (name, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [name, email]
 )
    console.log(`User: ${name} inserted successfully.`);    
rl.close();


    // Hardcoded users for example
//     await query(
//     "INSERT INTO users89 (name, email) VALUES ($1, $2) ON CONFLICT DO NOTHING",
//     ["Alice", "alice@example.com"]
//   );
//   await query(
//     "INSERT INTO users89 (name, email) VALUES ($1, $2) ON CONFLICT DO NOTHING",
//     ["Bob", "bob@example.com"]
//   );


// Fetch all users and return them as User[].
const result = await query(`SELECT * FROM users89`);
const users89: User[] = result.rows.map(mapUser);

console.log(`All Users..`);
console.log(users89);

// Confirm TypeScript errors if you try to access non-existent fields.
// users89[0].nonExistentField;    //property does not exist on type 'User'

}
createUsersTable().catch(console.error);