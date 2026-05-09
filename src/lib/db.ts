import { Surreal, RecordId } from 'surrealdb';

export interface IDBAdapter {
  get<T>(table: string, id: string): Promise<T | null>;
  list<T>(table: string, options?: { filter?: string; params?: any; order?: string; limit?: number }): Promise<T[]>;
  insert<T>(table: string, data: any): Promise<T>;
  update<T>(table: string, id: string, data: any): Promise<T>;
  edit<T>(table: string, id: string, data: any): Promise<T>;
  upsert<T>(table: string, id: string, data: any): Promise<T>;
  delete(table: string, id: string): Promise<void>;
  increment(table: string, id: string, field: string, amount?: number): Promise<void>;
  relate(from: string, edge: string, to: string, data?: any): Promise<void>;
  search<T>(table: string, term: string, fields: string[]): Promise<T[]>;
  query<T>(sql: string, params?: any): Promise<T>;
  migrate(): Promise<void>;
}

export class SurrealAdapter implements IDBAdapter {
  constructor(private db: Surreal) {}

  async migrate(): Promise<void> {
    const schemaQueries = [
      'DEFINE TABLE users SCHEMALESS;',
      'DEFINE INDEX userEmail ON users FIELDS email UNIQUE;',
      'DEFINE TABLE places SCHEMALESS;',
      'DEFINE INDEX placeName ON places FIELDS name UNIQUE;',
      'DEFINE TABLE posts SCHEMALESS;',
      'DEFINE TABLE jobs SCHEMALESS;',
      'DEFINE TABLE cv_sections SCHEMALESS;',
      'DEFINE TABLE comments SCHEMALESS;',
      'DEFINE TABLE messages SCHEMALESS;',
      'DEFINE TABLE notifications SCHEMALESS;',
      'DEFINE TABLE topics SCHEMALESS;',
      'DEFINE TABLE skills SCHEMALESS;',
      'DEFINE TABLE connects_to TYPE RELATION FROM users TO users;',
      'DEFINE TABLE follows_topic TYPE RELATION FROM users TO topics;',
      'DEFINE TABLE applies_to TYPE RELATION FROM users TO jobs;',
      'DEFINE TABLE tagged_with TYPE RELATION FROM posts TO topics;',
      'DEFINE TABLE job_tagged_with TYPE RELATION FROM jobs TO topics;',
      'DEFINE TABLE requires_skill TYPE RELATION FROM jobs TO skills;',
      'DEFINE TABLE user_has_skill TYPE RELATION FROM users TO skills;',
      'DEFINE TABLE user_skills SCHEMALESS;',
      'DEFINE TABLE portfolio SCHEMALESS;',
      'DEFINE TABLE files SCHEMALESS;',
      'DEFINE TABLE job_alerts SCHEMALESS;',
      'DEFINE TABLE conversations SCHEMALESS;',
    ];

    for (const q of schemaQueries) {
      try {
        await this.db.query(q);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('already exists')) continue;
        
        // IAM error or permissions: warn but don't fail migration if tables might already exist
        if (msg.includes('IAM error') || msg.includes('permissions')) {
          console.warn(`[SurrealAdapter] Permission warning during migration: ${msg}`);
          continue;
        }
        
        console.warn(`Schema query failed: ${q}`, msg);
      }
    }
  }

  private toRecordId(id: string): RecordId {
    if (id.includes(':')) {
      const [tb, val] = id.split(':');
      return new RecordId(tb, val);
    }
    // We assume the caller might pass a table-prefixed ID or just the ID but here we need consistency
    // If it's just a UUID/slug, it's safer to have table info.
    return id as any; 
  }

  private stringifyId(id: any): string {
    if (!id) return '';
    return id.toString();
  }

  async get<T>(table: string, id: string): Promise<T | null> {
    try {
      const recordId = id.includes(':') ? id : `${table}:${id}`;
      const result = await this.db.select(recordId as any);
      return (result as any) || null;
    } catch (e) {
      console.error(`DB Get Error [${table}:${id}]:`, e);
      return null;
    }
  }

  async list<T>(table: string, options: { filter?: string; params?: any; order?: string; limit?: number } = {}): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    if (options.filter) sql += ` WHERE ${options.filter}`;
    if (options.order) sql += ` ORDER BY ${options.order}`;
    if (options.limit) sql += ` LIMIT ${options.limit}`;
    
    try {
      const results = await this.db.query(sql, options.params || {});
      const data = (results as any)?.[0] || [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`DB List Error [${table}]:`, e);
      return [];
    }
  }

  async insert<T>(table: string, data: any): Promise<T> {
    try {
      const { id, ...content } = data;
      let sql: string;
      let params: any;
      if (id) {
        const recordId = id.includes(':') ? id : `${table}:${id}`;
        sql = 'CREATE type::record($id) CONTENT $data';
        params = { id: recordId, data: content };
      } else {
        sql = `CREATE ${table} CONTENT $data`;
        params = { data: content };
      }
      const results = await this.db.query(sql, params);
      const result = (results as any)?.[0];
      if (!result || result.length === 0) throw new Error(`Failed to insert into ${table}`);
      return result[0];
    } catch (e) {
      console.error(`DB Insert Error [${table}]:`, e);
      throw e;
    }
  }

  async update<T>(table: string, id: string, data: any): Promise<T> {
    try {
      const recordId = id.includes(':') ? id : `${table}:${id}`;
      const results = await this.db.query('UPDATE type::record($id) MERGE $data', { id: recordId, data });
      const result = (results as any)?.[0];
      if (!result || result.length === 0) throw new Error(`Failed to update ${id}`);
      return result[0];
    } catch (e) {
      console.error(`DB Update Error [${id}]:`, e);
      throw e;
    }
  }

  async edit<T>(table: string, id: string, data: any): Promise<T> {
    return this.update<T>(table, id, data);
  }

  async upsert<T>(table: string, id: string, data: any): Promise<T> {
    try {
      const recordId = id.includes(':') ? id : `${table}:${id}`;
      // SDK doesn't have a direct upsert, so we use SQL
      const [result] = await this.db.query<[T[]]>('UPSERT type::record($id) CONTENT $data', { id: recordId, data });
      if (!result || result.length === 0) throw new Error(`Failed to upsert ${recordId}`);
      return result[0];
    } catch (e) {
      console.error(`DB Upsert Error [${id}]:`, e);
      throw e;
    }
  }

  async delete(table: string, id: string): Promise<void> {
    try {
      const recordId = id.includes(':') ? id : `${table}:${id}`;
      await this.db.delete(recordId as any);
    } catch (e) {
      console.error(`DB Delete Error [${id}]:`, e);
      throw e;
    }
  }

  async increment(table: string, id: string, field: string, amount: number = 1): Promise<void> {
    try {
      const recordId = id.includes(':') ? id : `${table}:${id}`;
      await this.db.query(`UPDATE type::record($id) SET ${field} = (${field} || 0) + $amount`, { id: recordId, amount });
    } catch (e) {
      console.error(`DB Increment Error [${id}.${field}]:`, e);
      throw e;
    }
  }

  async relate(from: string, edge: string, to: string, data: any = {}): Promise<void> {
    try {
      await this.db.query(`RELATE type::record($from)->${edge}->type::record($to) CONTENT $data`, { from, to, data });
    } catch (e) {
      console.error(`DB Relate Error [${from} -> ${edge} -> ${to}]:`, e);
      throw e;
    }
  }

  async search<T>(table: string, term: string, fields: string[]): Promise<T[]> {
    if (!term) return [];
    try {
      const conditions = fields.map(f => `${f} ~ $term`).join(' OR ');
      const results = await this.db.query(`SELECT * FROM ${table} WHERE ${conditions}`, { term });
      const data = (results as any)?.[0] || [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`DB Search Error [${table}]:`, e);
      return [];
    }
  }

  async query<T>(sql: string, params?: any): Promise<T> {
    try {
      const results = await this.db.query(sql, params);
      return results as any;
    } catch (e) {
      console.error(`DB Raw Query Error:`, e);
      throw e;
    }
  }
}
