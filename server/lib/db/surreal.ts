import { Surreal } from 'surrealdb';

let db: Surreal | null = null;

export async function getSurreal() {
  if (db) return db;

  const url = process.env.SURREAL_URL || 'http://127.0.0.1:8000';
  const ns = process.env.SURREAL_NS || 'test';
  const database = process.env.SURREAL_DB || 'test';
  const user = process.env.SURREAL_USER || 'root';
  const pass = process.env.SURREAL_PASS || 'root';

  db = new Surreal();

  try {
    await db.connect(url);
    await db.use({ namespace: ns, database: database });
    
    if (user && pass) {
      await db.signin({
        username: user,
        password: pass,
      });
    }
    
    console.log(`Connected to SurrealDB at ${url} (NS: ${ns}, DB: ${database})`);
    return db;
  } catch (err) {
    console.error('Failed to connect to SurrealDB:', err);
    throw err;
  }
}
