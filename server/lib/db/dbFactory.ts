import { Surreal } from 'surrealdb';
import { SurrealAdapter, type IDBAdapter } from './db';

let _db: Surreal | null = null;
let _adapter: IDBAdapter | null = null;
let _connecting: Promise<{ db: Surreal; adapter: IDBAdapter }> | null = null;

async function createConnection(): Promise<{ db: Surreal; adapter: IDBAdapter }> {
  const url = process.env.SURREAL_URL || 'http://127.0.0.1:8000';
  const ns = process.env.SURREAL_NS || 'test';
  const database = process.env.SURREAL_DB || 'test';
  const user = process.env.SURREAL_USER || 'root';
  const pass = process.env.SURREAL_PASS || 'root';

  const db = new Surreal();

  try {
    await db.connect(url);

    // SurrealDB v2: signin must come BEFORE use()
    if (user && pass) {
      await db.signin({ username: user, password: pass });
    }

    await db.use({ namespace: ns, database });

    _db = db;
    _adapter = new SurrealAdapter(db);
    console.log(`[DB] Connected to SurrealDB at ${url} (NS: ${ns}, DB: ${database})`);

    return { db: _db, adapter: _adapter };
  } catch (err) {
    _db = null;
    _adapter = null;
    _connecting = null;
    throw err;
  }
}

function getConnection(): Promise<{ db: Surreal; adapter: IDBAdapter }> {
  if (_db && _adapter) {
    return Promise.resolve({ db: _db, adapter: _adapter });
  }
  // Deduplicate concurrent connection attempts
  if (!_connecting) {
    _connecting = createConnection().finally(() => {
      _connecting = null;
    });
  }
  return _connecting;
}

export async function getRawDb(): Promise<Surreal> {
  const { db } = await getConnection();
  return db;
}

export async function getAdapter(): Promise<IDBAdapter> {
  const { adapter } = await getConnection();
  return adapter;
}

export function resetConnection(): void {
  _db = null;
  _adapter = null;
  _connecting = null;
}
