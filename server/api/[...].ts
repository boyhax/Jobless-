import { Hono } from 'hono';
import { Surreal, RecordId } from 'surrealdb';
import { SurrealAdapter, IDBAdapter } from '../../src/lib/db.ts';
import bcrypt from 'bcryptjs';
import { defineEventHandler, toWebRequest } from 'h3';

let db: Surreal;
let adapter: IDBAdapter;
let initPromise: Promise<void> | null = null;

// Helper to safely parse record ID strings
const toRecordId = (id: any, table?: string): RecordId | null => {
  if (!id) return null;
  if (id instanceof RecordId) return id;
  if (typeof id === 'string') {
    if (id.includes(':')) {
      const [tb, val] = id.split(':');
      return new RecordId(tb, val);
    } else if (table) {
      return new RecordId(table, id);
    }
  }
  return id as any;
};

// Helper to safely convert Surreal IDs to strings
const stringId = (id: any): string => {
  if (!id) return '';
  if (typeof id === 'string') return id;
  return id.toString();
};

export async function initSurreal() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    const url = process.env.SURREAL_URL || 'http://127.0.0.1:8000';
    const ns = process.env.SURREAL_NS || 'test';
    const database = process.env.SURREAL_DB || 'test';
    const user = process.env.SURREAL_USER || 'root';
    const pass = process.env.SURREAL_PASS || 'root';

    db = new Surreal();

    try {
      console.log(`[Nitro Admin] Connecting to SurrealDB at ${url}...`);
      await db.connect(url);
      
      if (user && pass) {
        try {
          await db.signin({ username: user, password: pass });
        } catch (e) {
          console.warn('SurrealDB signin failed:', (e as Error).message);
        }
      }

      await db.use({ namespace: ns, database });
      adapter = new SurrealAdapter(db);
      
      console.log(`[Nitro Admin] Successfully connected to SurrealDB`);
      
      if (process.env.AUTOMIGRATE === 'true') {
        console.log(`[Nitro Admin] Starting automatic migration...`);
        await adapter.migrate().catch(err => {
          console.error('[Nitro Admin] Migration failed:', err.message);
        });
        await setupDatabase().catch(err => {
          console.error('[Nitro Admin] Setup failed:', err.message);
        });
        console.log(`[Nitro Admin] Migration/Setup attempt finished`);
      }
    } catch (err) {
      console.error('Failed to connect to SurrealDB:', err);
      initPromise = null; // Allow retry on next request
      throw err;
    }
  })();

  return initPromise;
}

const cities = [
  { id: 'places:muscat', name: 'Muscat', region: 'Muscat' },
  { id: 'places:salalah', name: 'Salalah', region: 'Dhofar' },
  { id: 'places:sohar', name: 'Sohar', region: 'Al Batinah North' },
  { id: 'places:nizwa', name: 'Nizwa', region: 'Al Dakhiliyah' },
  { id: 'places:sur', name: 'Sur', region: 'Al Sharqiyah South' },
  { id: 'places:ibri', name: 'Ibri', region: 'Al Dhahirah' },
  { id: 'places:khasab', name: 'Khasab', region: 'Musandam' },
  { id: 'places:rustaq', name: 'Rustaq', region: 'Al Batinah South' }
];

export async function setupDatabase() {
  let count = 0;
  try {
    const [places] = await db.query('SELECT count() FROM places GROUP ALL');
    count = (places as any)?.[0]?.count || 0;
  } catch (e) {
    console.warn('[setupDatabase] Initial count check failed:', (e as Error).message);
    // If it fails, assume we might need to seed if migration created the table but it's empty
    // but better to just return and let next attempt or list fail gracefully
  }
  
  if (count === 0) {
    console.log('Seeding places...');
    for (const city of cities) {
      try {
        await db.query('UPSERT type::record($id) CONTENT $data', { id: city.id, data: { name: city.name, region: city.region } });
      } catch (e) {
        console.error(`Failed to seed city ${city.id}:`, (e as Error).message);
      }
    }
  }
}

const app = new Hono();

app.use('*', async (c, next) => {
  try {
    await initSurreal();
    if (!adapter) throw new Error('Database adapter not initialized');
  } catch (err) {
    return c.json({ error: 'Database connection failed', details: (err as Error).message }, 503);
  }
  await next();
});

app.get('/api/health', (c) => c.json({ status: 'ok', database: db ? 'connected' : 'disconnected' }));

app.get('/api/app-init', async (c) => {
  const userId = c.req.header('x-user-id');
  try {
    let usersCount = 0;
    try {
      const [users] = await db.query('SELECT count() as count FROM users WHERE role = "admin" GROUP ALL') as any;
      usersCount = users?.[0]?.count || 0;
    } catch (e) {
      console.warn('Admin check failed in app-init:', (e as Error).message);
    }

    let places: any[] = [];
    try {
      places = await adapter.list('places') as any[];
    } catch (e) {
      console.warn('Places fetch failed in app-init:', (e as Error).message);
    }

    const initialized = usersCount > 0;
    
    let currentUserData = null;
    let notifications = [];
    let followedTopics = [];
    let conversations = [];
    
    if (userId) {
      try {
        const uId = userId.toString();
        const userRID = toRecordId(uId, 'users');
        const [userRecord, notifs, topics, msgs] = await Promise.all([
          adapter.get('users', uId),
          db.query('SELECT * FROM notifications WHERE user_id = $uid ORDER BY created_at DESC LIMIT 10', { uid: userRID }),
          db.query('SELECT value FROM followed_topics WHERE user_id = $uid', { uid: userRID }),
          db.query('SELECT * FROM messages WHERE sender_id = $uid OR receiver_id = $uid ORDER BY created_at DESC LIMIT 50', { uid: userRID })
        ]);
        
        currentUserData = userRecord;
        notifications = notifs as any;
        followedTopics = (topics as any)?.map((t: any) => t.value) || [];
        
        // Derive conversations
        const convMap = new Map();
        ((msgs as any) || []).forEach((m: any) => {
          const otherId = stringId(m.sender_id) === uId ? stringId(m.receiver_id) : stringId(m.sender_id);
          if (!convMap.has(otherId)) {
            convMap.set(otherId, m);
          }
        });

        conversations = await Promise.all(Array.from(convMap.entries()).map(async ([otherId, msg]) => {
          const user = await adapter.get<any>('users', otherId);
          return {
            ...(msg as any),
            id: stringId((msg as any).id),
            user: user ? { ...user, id: stringId(user.id) } : null
          };
        }));
      } catch (e) {
        console.warn('Initial user data fetch failed:', (e as Error).message);
      }
    }

    return c.json({
      setup: { initialized },
      places: places || [],
      user: currentUserData,
      notifications: notifications || [],
      followedTopics: followedTopics || [],
      conversations: conversations || []
    });
  } catch (err) {
    console.error('App init failed:', err);
    return c.json({ error: 'App initialization data fetch failed', details: (err as Error).message }, 500);
  }
});

app.get('/api/setup/status', async (c) => {
  try {
    const [users] = await db.query('SELECT count() as count FROM users WHERE role = "admin" GROUP ALL') as any;
    const count = users?.[0]?.count || 0;
    return c.json({ initialized: count > 0 });
  } catch (err) {
    return c.json({ initialized: false });
  }
});

app.post('/api/setup/init', async (c) => {
  const { email, password, fullName, seed } = await c.req.json();
  try {
    const [existing] = await db.query('SELECT count() as count FROM users WHERE role = "admin" GROUP ALL') as any;
    if (existing?.[0]?.count > 0) {
      return c.json({ error: 'System already initialized. Setup is locked.' }, 403);
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    
    if (seed) {
      const uId = 'users:admin_root';
      await db.query('UPSERT type::record($id) CONTENT $data', {
        id: uId,
        data: {
          email, full_name: fullName, role: 'admin', password: hash, subscription: 'enterprise',
          created_at: new Date().toISOString(), headline: 'System Administrator',
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`,
        }
      });
    } else {
      const adminId = `users:admin_${Date.now()}`;
      await db.query('CREATE type::record($id) CONTENT $data', {
        id: adminId,
        data: {
          email, full_name: fullName, role: 'admin', password: hash, subscription: 'enterprise',
          created_at: new Date().toISOString(),
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`,
          headline: 'System Administrator'
        }
      });
    }
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get('/api/auth/me', async (c) => {
  const userId = c.req.header('x-user-id');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const idRecord = toRecordId(userId, 'users');
    const [users] = await db.query('SELECT * FROM type::record($userId)', { userId: idRecord }) as any;
    const user = users?.[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({ ...user, id: stringId(user.id) });
  } catch (err) {
    return c.json({ error: 'Session invalid' }, 401);
  }
});

app.get('/api/places', async (c) => {
  try {
    const places = await adapter.list('places') as any[];
    return c.json(places.map((p: any) => ({ ...p, id: stringId(p.id) })));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const [users] = await db.query('SELECT * FROM users WHERE email = $email', { email }) as any;
  const user = users?.[0];
  if (!user || !user.password) return c.json({ error: 'Invalid credentials' }, 401);
  if (!bcrypt.compareSync(password, user.password)) return c.json({ error: 'Invalid credentials' }, 401);
  const { password: _, ...userWithoutPassword } = user;
  return c.json({ ...userWithoutPassword, id: stringId(user.id) });
});

app.post('/api/auth/check-email', async (c) => {
  const { email } = await c.req.json();
  const [user] = await db.query('SELECT id FROM users WHERE email = $email', { email }) as any;
  return c.json({ exists: !!(user?.[0]) });
});

app.post('/api/auth/register', async (c) => {
  const { email, password, full_name } = await c.req.json();
  const [existing] = await db.query('SELECT id FROM users WHERE email = $email', { email }) as any;
  if (existing?.[0]) return c.json({ error: 'Email already registered' }, 400);
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  try {
    const user = await adapter.insert<any>('users', {
      email, full_name, password: hash, headline: 'Professional Individual',
      subscription: 'free', role: 'jobseeker', created_at: new Date().toISOString(),
      profile_views: 0, engagement: 0, connections_received: 0
    });
    const { password: _, ...u } = user;
    return c.json({ ...u, id: stringId(user.id) });
  } catch (err) {
    return c.json({ error: 'Registration failed' }, 500);
  }
});

app.post('/api/auth/forgot-password', async (c) => {
  const { email } = await c.req.json();
  // Mock OTP for simplicity
  return c.json({ success: true, debug_otp: '123456' });
});

app.post('/api/auth/verify-otp', async (c) => {
  const { otp } = await c.req.json();
  if (otp === '123456') return c.json({ success: true });
  return c.json({ error: 'Invalid OTP' }, 400);
});

app.post('/api/auth/reset-password', async (c) => {
  const { email, otp, newPassword } = await c.req.json();
  if (otp !== '123456') return c.json({ error: 'Invalid OTP' }, 400);
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);
  await db.query('UPDATE users SET password = $hash WHERE email = $email', { hash, email });
  return c.json({ success: true });
});

app.get('/api/posts', async (c) => {
  const userId = c.req.query('userId');
  let query = 'SELECT *, user_id.* as user, (SELECT count() FROM comments WHERE post_id = $parent.id GROUP ALL)[0].count as comment_count FROM posts';
  const params: any = {};
  if (userId) { query += ' WHERE user_id = type::record($userId)'; params.userId = userId; }
  query += ' ORDER BY created_at DESC';
  try {
    const [posts] = await db.query(query, params) as any;
    return c.json((posts || []).map((p: any) => ({ 
      ...p, 
      id: stringId(p.id),
      full_name: p.user?.full_name || 'Professional Individual',
      avatar_url: p.user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.user?.full_name || 'User'}`,
      headline: p.user?.headline || 'Expert Professional',
      user: p.user ? { ...p.user, id: stringId(p.user.id) } : undefined 
    })));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post('/api/posts', async (c) => {
  const { user_id, ...rest } = await c.req.json();
  const content = rest.content || "";
  const post = await adapter.insert<any>('posts', { ...rest, user_id: toRecordId(user_id), created_at: new Date().toISOString() });
  const postId = post.id;

  const topics = content.match(/#[a-z0-9_]+/gi);
  if (topics) {
    for (const t of topics) {
      const topicName = t.startsWith('#') ? t.slice(1).toLowerCase() : t.toLowerCase();
      const topicId = toRecordId(topicName, 'topics');
      if (topicId) {
        await db.query('UPSERT $topicId SET name = $name', { topicId, name: topicName });
        await db.query('RELATE $postId->tagged_with->$topicId SET created_at = time::now()', { postId, topicId });
      }
    }
  }
  return c.json({ success: true, id: stringId(postId) });
});

app.get('/api/posts/:postId/comments', async (c) => {
  const postId = c.req.param('postId');
  const [comments] = await db.query('SELECT *, user_id.full_name as full_name, user_id.avatar_url as avatar_url FROM comments WHERE post_id = type::record($postId) ORDER BY created_at ASC', { postId: toRecordId(postId, 'posts') }) as any;
  return c.json((comments || []).map((cl: any) => ({ ...cl, id: stringId(cl.id) })));
});

app.post('/api/comments', async (c) => {
  const { user_id, post_id, content } = await c.req.json();
  const comment = await adapter.insert<any>('comments', {
    user_id: toRecordId(user_id),
    post_id: toRecordId(post_id),
    content,
    created_at: new Date().toISOString()
  });
  return c.json({ success: true, id: stringId(comment.id) });
});

app.get('/api/notifications/:userId', async (c) => {
  const userId = c.req.param('userId');
  const idRecord = toRecordId(userId, 'users');
  const [notifications] = await db.query('SELECT * FROM notifications WHERE user_id = type::record($userId) ORDER BY created_at DESC LIMIT 20', { userId: idRecord }) as any;
  return c.json((notifications || []).map((n: any) => ({ ...n, id: stringId(n.id) })));
});

app.post('/api/notifications/read', async (c) => {
  const { id } = await c.req.json();
  if (id) await db.query('UPDATE type::record($id) SET read = true', { id: toRecordId(id) });
  return c.json({ success: true });
});

app.get('/api/connections/status/:userId/:targetId', async (c) => {
  const { userId, targetId } = c.req.param();
  const uId = toRecordId(userId, 'users');
  const tId = toRecordId(targetId, 'users');
  const [connection] = await db.query('SELECT count() FROM connects_to WHERE in = $uId AND out = $tId', { uId, tId }) as any;
  const isConnected = (connection?.[0]?.count || 0) > 0;
  return c.json({ connected: isConnected });
});

app.post('/api/connections', async (c) => {
  const { user_id, target_id } = await c.req.json();
  const uId = toRecordId(user_id, 'users');
  const tId = toRecordId(target_id, 'users');
  await db.query('RELATE $uId->connects_to->$tId SET status = "accepted", created_at = time::now()', { uId, tId });
  await adapter.increment('users', target_id, 'connections_received', 1);
  return c.json({ success: true });
});

app.get('/api/topics/followed/:userId', async (c) => {
  const userId = c.req.param('userId');
  const idRecord = toRecordId(userId, 'users');
  const [topics] = await db.query('SELECT out.name as name FROM follows_topic WHERE in = $userId', { userId: idRecord }) as any;
  return c.json((topics || []).map((t: any) => t.name));
});

app.get('/api/profile/:userId', async (c) => {
  const userId = c.req.param('userId');
  const idRecord = toRecordId(userId, 'users');
  try {
    const [users] = await db.query('SELECT * FROM type::record($id)', { id: idRecord }) as any;
    const user = users?.[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    const [cv] = await db.query('SELECT * FROM cv_sections WHERE user_id = type::record($id) ORDER BY start_date DESC', { id: idRecord }) as any;
    const [skills] = await db.query('SELECT * FROM user_skills WHERE user_id = type::record($id)', { id: idRecord }) as any;
    const [portfolio] = await db.query('SELECT * FROM portfolio WHERE user_id = type::record($id)', { id: idRecord }) as any;
    const [jobs] = (user.is_company_rep || user.role === 'company' ? await db.query('SELECT * FROM jobs WHERE user_id = type::record($id) ORDER BY created_at DESC', { id: idRecord }) : [[]]) as any[];
    const [countsResult] = await db.query(`
      SELECT 
        (SELECT count() FROM connects_to WHERE out = $parent.id GROUP ALL)[0].count as connections_count,
        (SELECT VALUE out.name FROM follows_topic WHERE in = $parent.id) as followed_topics
      FROM users WHERE id = type::record($id)
    `, { id: idRecord }) as any;
    const counts = countsResult?.[0];
    return c.json({ 
      ...user, id: stringId(user.id), 
      cv: (cv || []).map((cl: any) => ({ ...cl, id: stringId(cl.id) })),
      skills: (skills || []).map((s: any) => ({ ...s, id: stringId(s.id) })),
      portfolio: (portfolio || []).map((p: any) => ({ ...p, id: stringId(p.id) })),
      jobs: (jobs || []).map((j: any) => ({ ...j, id: stringId(j.id) })),
      connections_count: counts?.connections_count || 0,
      followed_topics: counts?.followed_topics || []
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post('/api/profile', async (c) => {
  const { id, ...data } = await c.req.json();
  const idRecord = toRecordId(id, 'users');
  await db.query('UPDATE type::record($id) MERGE $data', { id: idRecord, data });
  return c.json({ success: true });
});

app.get('/api/jobs', async (c) => {
  const q = c.req.query('q');
  const placeId = c.req.query('placeId');
  const experience = c.req.query('experience');
  
  let query = 'SELECT *, place_id.name as place_name, (SELECT VALUE out.name FROM requires_skill WHERE in = $parent.id) as skills, (SELECT VALUE out.name FROM job_tagged_with WHERE in = $parent.id) as topics FROM jobs WHERE 1=1';
  const params: any = {};
  if (q) { query += ' AND (title ~ $q OR description ~ $q OR company_name ~ $q)'; params.q = q; }
  if (placeId && placeId !== 'all') { query += ' AND place_id = type::record($placeId)'; params.placeId = placeId.includes(':') ? placeId : `places:${placeId}`; }
  if (experience && experience !== 'all') { query += ' AND experience_level = $experience'; params.experience = experience; }
  query += ' ORDER BY created_at DESC';
  
  const [jobs] = await db.query(query, params) as any;
  return c.json((jobs || []).map((j: any) => ({ ...j, id: stringId(j.id) })));
});

app.post('/api/jobs', async (c) => {
  const { user_id, ...data } = await c.req.json();
  const job = await adapter.insert<any>('jobs', {
    ...data,
    user_id: toRecordId(user_id),
    created_at: new Date().toISOString()
  });
  return c.json({ success: true, id: stringId(job.id) });
});

app.post('/api/jobs/apply', async (c) => {
  const { user_id, job_id, attachment_type, attachment_id } = await c.req.json();
  await db.query('RELATE type::record($userId)->applies_to->type::record($jobId) CONTENT $data', {
    userId: toRecordId(user_id),
    jobId: toRecordId(job_id),
    data: {
      attachment_type,
      attachment_id: toRecordId(attachment_id),
      status: 'pending',
      created_at: new Date().toISOString()
    }
  });
  return c.json({ success: true });
});

app.get('/api/jobs/applications/status', async (c) => {
  const userId = c.req.query('userId');
  const jobId = c.req.query('jobId');
  const [results] = await db.query('SELECT status FROM applies_to WHERE in = type::record($userId) AND out = type::record($jobId)', {
    userId: toRecordId(userId, 'users'),
    jobId: toRecordId(jobId, 'jobs')
  }) as any;
  return c.json({ status: results?.[0]?.status || null });
});

app.get('/api/search', async (c) => {
  const q = c.req.query('q');
  const term = q as string;
  const results: any = { posts: [], jobs: [], users: [] };
  if (term) {
    const posts = await adapter.search<any>('posts', term, ['content']);
    results.posts = (posts || []).map((p: any) => ({ ...p, id: stringId(p.id), user: p.user ? { ...p.user, id: stringId(p.user.id) } : undefined }));
    results.jobs = await adapter.search<any>('jobs', term, ['title', 'company_name', 'description']);
    results.jobs = results.jobs.map((j: any) => ({ ...j, id: stringId(j.id) }));
    results.users = await adapter.search<any>('users', term, ['full_name', 'headline']);
    results.users = results.users.map((ur: any) => ({ ...ur, id: stringId(ur.id) }));
  }
  return c.json(results);
});

app.post('/api/messages', async (c) => {
  const { sender_id, receiver_id, content } = await c.req.json();
  const msg = await adapter.insert<any>('messages', {
    sender_id: toRecordId(sender_id),
    receiver_id: toRecordId(receiver_id),
    content,
    created_at: new Date().toISOString(),
    read: false
  });
  return c.json({ success: true, id: stringId(msg.id) });
});

app.get('/api/content', async (c) => {
  const [posts] = await db.query('SELECT *, user_id.* as user, (SELECT count() FROM comments WHERE post_id = $parent.id GROUP ALL)[0].count as comment_count FROM posts ORDER BY created_at DESC LIMIT 50') as any;
  const processedPosts = (posts || []).map((p: any) => ({
    ...p,
    id: stringId(p.id),
    full_name: p.user?.full_name || 'Professional Individual',
    avatar_url: p.user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.user?.full_name || 'User'}`,
    headline: p.user?.headline || 'Expert Professional',
    user: p.user ? { ...p.user, id: stringId(p.user.id) } : undefined
  }));
  return c.json({ 
    topics: cities.map(c => c.name),
    posts: processedPosts
  });
});

app.post('/api/cv', async (c) => {
  const { user_id, ...data } = await c.req.json();
  const section = await adapter.insert<any>('cv_sections', {
    user_id: toRecordId(user_id),
    ...data,
    created_at: new Date().toISOString()
  });
  return c.json({ success: true, id: stringId(section.id) });
});

app.post('/api/skills', async (c) => {
  const { user_id, skill_name } = await c.req.json();
  const skill = await adapter.insert<any>('user_skills', {
    user_id: toRecordId(user_id),
    name: skill_name,
    verified: false,
    created_at: new Date().toISOString()
  });
  return c.json({ success: true, id: stringId(skill.id) });
});

app.post('/api/skills/verify', async (c) => {
  const { user_id, skill_id } = await c.req.json();
  await db.query('UPDATE type::record($id) SET verified = true', { id: toRecordId(skill_id) });
  return c.json({ success: true });
});

app.post('/api/portfolio', async (c) => {
  const { user_id, ...data } = await c.req.json();
  const item = await adapter.insert<any>('portfolio', {
    user_id: toRecordId(user_id),
    ...data,
    created_at: new Date().toISOString()
  });
  return c.json({ success: true, id: stringId(item.id) });
});

app.post('/api/files', async (c) => {
  const { user_id, ...data } = await c.req.json();
  const file = await adapter.insert<any>('files', {
    user_id: toRecordId(user_id),
    ...data,
    created_at: new Date().toISOString()
  });
  return c.json({ success: true, id: stringId(file.id) });
});

app.post('/api/job-alerts', async (c) => {
  const { user_id, ...data } = await c.req.json();
  const alert = await adapter.insert<any>('job_alerts', {
    user_id: toRecordId(user_id),
    ...data,
    created_at: new Date().toISOString()
  });
  return c.json({ success: true, id: stringId(alert.id) });
});

app.post('/api/user/preference/place', async (c) => {
  const { user_id, place_id } = await c.req.json();
  await db.query('UPDATE type::record($uId) SET preferred_place = type::record($pId)', {
    uId: toRecordId(user_id),
    pId: toRecordId(place_id)
  });
  return c.json({ success: true });
});

app.get('/api/candidates', async (c) => {
  const skills = c.req.query('skills');
  let query = 'SELECT *, user_id.* as user FROM user_skills';
  const params: any = {};
  if (skills) {
    query += ' WHERE name CONTAINS $skills';
    params.skills = skills;
  }
  const [results] = await db.query(query, params) as any;
  return c.json((results || []).map((r: any) => ({ ...r, id: stringId(r.id), user: r.user ? { ...r.user, id: stringId(r.user.id) } : undefined })));
});

app.get('/api/recommendations', async (c) => {
  const [results] = await db.query('SELECT * FROM posts WHERE attachment_type != null LIMIT 10') as any;
  return c.json((results || []).map((r: any) => ({ ...r, id: stringId(r.id) })));
});

app.get('/api/recommendations/:userId', async (c) => {
  const userId = c.req.param('userId');
  const [results] = await db.query('SELECT * FROM posts WHERE user_id != type::record($userId) LIMIT 10', { userId: toRecordId(userId, 'users') }) as any;
  return c.json((results || []).map((r: any) => ({ ...r, id: stringId(r.id) })));
});

app.get('/api/files/:userId', async (c) => {
  const userId = c.req.param('userId');
  const [files] = await db.query('SELECT * FROM files WHERE user_id = type::record($userId) ORDER BY created_at DESC', { userId: toRecordId(userId, 'users') }) as any;
  return c.json((files || []).map((f: any) => ({ ...f, id: stringId(f.id) })));
});

app.delete('/api/files/:fileId', async (c) => {
  const fileId = c.req.param('fileId');
  await db.query('DELETE type::record($id)', { id: toRecordId(fileId, 'files') });
  return c.json({ success: true });
});

app.get('/api/job-alerts/:userId', async (c) => {
  const userId = c.req.param('userId');
  const [alerts] = await db.query('SELECT * FROM job_alerts WHERE user_id = type::record($userId)', { userId: toRecordId(userId, 'users') }) as any;
  return c.json((alerts || []).map((a: any) => ({ ...a, id: stringId(a.id) })));
});

app.delete('/api/job-alerts/:alertId', async (c) => {
  const alertId = c.req.param('alertId');
  await db.query('DELETE type::record($id)', { id: toRecordId(alertId, 'job_alerts') });
  return c.json({ success: true });
});

app.post('/api/posts/:postId/respond', async (c) => {
  const postId = c.req.param('postId');
  const { user_id, type, response_index } = await c.req.json();
  const res = await adapter.insert<any>('post_responses', {
    post_id: toRecordId(postId, 'posts'),
    user_id: toRecordId(user_id, 'users'),
    type,
    response_index,
    created_at: new Date().toISOString()
  });
  
  // Update stats on post (simplified)
  const [post] = await db.query('SELECT response_stats FROM type::record($id)', { id: toRecordId(postId, 'posts') }) as any;
  let stats = post[0]?.response_stats || "";
  const statsMap = new Map();
  if (stats) {
    stats.split(',').forEach((s: string) => {
      const [idx, count] = s.split(':');
      statsMap.set(idx, Number(count));
    });
  }
  statsMap.set(String(response_index), (statsMap.get(String(response_index)) || 0) + 1);
  const newStats = Array.from(statsMap.entries()).map(([idx, count]) => `${idx}:${count}`).join(',');
  await db.query('UPDATE type::record($id) SET response_stats = $stats', { id: toRecordId(postId, 'posts'), stats: newStats });

  return c.json({ success: true, id: stringId(res.id) });
});

app.delete('/api/posts/:postId', async (c) => {
  const postId = c.req.param('postId');
  const userId = c.req.header('x-user-id');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  
  const [post] = await db.query('SELECT user_id FROM type::record($id)', { id: toRecordId(postId, 'posts') }) as any;
  if (!post?.[0]) return c.json({ error: 'Post not found' }, 404);
  
  const [user] = await db.query('SELECT role FROM type::record($userId)', { userId: toRecordId(userId, 'users') }) as any;
  if (stringId(post[0].user_id) !== userId && user?.[0]?.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await db.query('DELETE type::record($id)', { id: toRecordId(postId, 'posts') });
  return c.json({ success: true });
});

app.put('/api/posts/:postId', async (c) => {
  const postId = c.req.param('postId');
  const userId = c.req.header('x-user-id');
  const { content } = await c.req.json();
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const [post] = await db.query('SELECT user_id FROM type::record($id)', { id: toRecordId(postId, 'posts') }) as any;
  if (!post?.[0]) return c.json({ error: 'Post not found' }, 404);

  if (stringId(post[0].user_id) !== userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await db.query('UPDATE type::record($id) SET content = $content', { id: toRecordId(postId, 'posts'), content });
  return c.json({ success: true });
});

app.get('/api/jobs/:jobId/applicants', async (c) => {
  const jobId = c.req.param('jobId');
  const [results] = await db.query('SELECT in.* as user, status, attachment_type, attachment_id FROM applies_to WHERE out = type::record($jobId)', { jobId: toRecordId(jobId, 'jobs') }) as any;
  return c.json((results || []).map((r: any) => ({
    ...r,
    user: r.user ? { ...r.user, id: stringId(r.user.id) } : undefined
  })));
});

app.get('/api/connections/:userId/:targetId', async (c) => {
    // This is probably for fetching a specific connection record
    const { userId, targetId } = c.req.param();
    const [results] = await db.query('SELECT * FROM connections WHERE (user_id = type::record($u1) AND target_id = type::record($t1)) OR (user_id = type::record($t1) AND target_id = type::record($u1))', {
        u1: toRecordId(userId, 'users'),
        t1: toRecordId(targetId, 'users')
    }) as any;
    return c.json(results?.[0] ? { ...results[0], id: stringId(results[0].id) } : null);
});

app.delete('/api/connections/:userId/:targetId', async (c) => {
  const { userId, targetId } = c.req.param();
  await db.query('DELETE connections WHERE (user_id = type::record($u1) AND target_id = type::record($t1)) OR (user_id = type::record($t1) AND target_id = type::record($u1))', {
    u1: toRecordId(userId, 'users'),
    t1: toRecordId(targetId, 'users')
  });
  return c.json({ success: true });
});

app.get('/api/topics', async (c) => {
  const userId = c.req.query('userId');
  if (userId) {
     const [followed] = await db.query('SELECT out.name as name FROM follows_topic WHERE in = type::record($userId)', { userId: toRecordId(userId, 'users') }) as any;
     return c.json((followed || []).map((f: any) => f.name));
  }
  const [topics] = await db.query('SELECT name FROM topics LIMIT 50') as any;
  return c.json((topics || []).map((t: any) => t.name));
});

app.post('/api/topics/follow', async (c) => {
  const { user_id, topic } = await c.req.json();
  const actualTopic = typeof topic === 'string' ? topic : topic?.name;
  if (!actualTopic || typeof actualTopic !== 'string') return c.json({ error: 'Valid topic name required' }, 400);
  
  const tName = actualTopic.startsWith('#') ? actualTopic.slice(1) : actualTopic;
  const [existing] = await db.query('SELECT id FROM topics WHERE name = $name', { name: tName }) as any;
  let topicId;
  if (!existing?.[0]) {
      const t = await adapter.insert<any>('topics', { name: tName });
      topicId = t.id;
  } else {
      topicId = existing[0].id;
  }
  await db.query('RELATE type::record($uId)->follows_topic->$topicId SET created_at = time::now()', { uId: toRecordId(user_id, 'users'), topicId });
  return c.json({ success: true });
});

app.post('/api/topics/unfollow', async (c) => {
  const { user_id, topic } = await c.req.json();
  const actualTopic = typeof topic === 'string' ? topic : topic?.name;
  if (!actualTopic || typeof actualTopic !== 'string') return c.json({ error: 'Valid topic name required' }, 400);

  const tName = actualTopic.startsWith('#') ? actualTopic.slice(1) : actualTopic;
  await db.query('DELETE follows_topic WHERE in = type::record($uId) AND out.name = $name', { uId: toRecordId(user_id, 'users'), name: tName });
  return c.json({ success: true });
});

app.get('/api/messages/conversations/:userId', async (c) => {
  const userId = c.req.param('userId');
  const uId = toRecordId(userId, 'users');
  try {
    // Get unique people this user has interacted with
    const [msgs] = await db.query(`
      SELECT * FROM messages 
      WHERE sender_id = $uId OR receiver_id = $uId 
      ORDER BY created_at DESC 
      LIMIT 100
    `, { uId }) as any;
    
    // Deduplicate in JS to get the last message for each contact
    const convMap = new Map();
    (msgs || []).forEach((m: any) => {
      const otherId = stringId(m.sender_id) === userId ? stringId(m.receiver_id) : stringId(m.sender_id);
      if (!convMap.has(otherId)) {
        convMap.set(otherId, m);
      }
    });

    const result = await Promise.all(Array.from(convMap.entries()).map(async ([otherId, msg]) => {
      const user = await adapter.get<any>('users', otherId);
      return {
        ...(msg as any),
        id: stringId((msg as any).id),
        user: user ? { ...user, id: stringId(user.id) } : null
      };
    }));

    return c.json(result);
  } catch (err) {
    console.error('Conversations fetch failed:', err);
    return c.json({ error: 'Failed to fetch conversations' }, 500);
  }
});

app.get('/api/messages/:uId/:tId', async (c) => {
  const { uId, tId } = c.req.param();
  const user1 = toRecordId(uId, 'users');
  const user2 = toRecordId(tId, 'users');
  const [msgs] = await db.query(`
    SELECT * FROM messages 
    WHERE (sender_id = $u1 AND receiver_id = $u2) OR (sender_id = $u2 AND receiver_id = $u1) 
    ORDER BY created_at ASC
  `, { u1: user1, u2: user2 }) as any;
  return c.json((msgs || []).map((m: any) => ({ ...m, id: stringId(m.id) })));
});

app.notFound((c) => {
  console.log(`[Hono 404] ${c.req.method} ${c.req.url}`);
  return c.json({ error: 'Route not found in Hono', path: c.req.path }, 404);
});

export default defineEventHandler(async (event) => {
  const req = toWebRequest(event);
  console.log(`[Nitro Hono] ${req.method} ${req.url}`);
  try {
    return await app.fetch(req);
  } catch (err) {
    console.error('[Hono Error]', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

