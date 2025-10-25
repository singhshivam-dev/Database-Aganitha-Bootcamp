import readline from "node:readline";
import { query } from "./db";

interface User {
  id?: number;
  name: string;
  email: string;
}

async function createUsersTable(){
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users64 (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
      )
`
await query(createTableQuery);

}


// Insert user into the DB
async function insertUser(user: User): Promise<void> {
  await query("INSERT INTO users64 (name, email) VALUES ($1, $2)", [
    user.name,
    user.email,
  ]);
  console.log(`User "${user.name}" inserted successfully.`);
}

// Fetch all users from the DB
async function fetchAllUsers(): Promise<User[]> {
  const result = await query("SELECT id, name, email FROM users64");
  return result.rows;
}

// CLI interaction for manual input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

(async () => {
    await createUsersTable();

  rl.question("Enter name: ", (name) => {
    rl.question("Enter email: ", async (email) => {
      try {
        await insertUser({ name, email });
        const allUsers = await fetchAllUsers();
        console.table(allUsers);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        rl.close();
        process.exit(0);
      }
    });
  });
})();
