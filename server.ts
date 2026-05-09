import express from 'express';
import 'dotenv/config';
import 'express-async-errors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Surreal, RecordId } from 'surrealdb';
import { SurrealAdapter, IDBAdapter } from './src/lib/db.ts';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Surreal;
let adapter: IDBAdapter;

// Helper to safely parse record ID strings (e.g. "users:abc") into RecordId objects
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
  const url = process.env.SURREAL_URL || 'http://127.0.0.1:8000';
  const ns = process.env.SURREAL_NS || 'test';
  const database = process.env.SURREAL_DB || 'test';
  const user = process.env.SURREAL_USER || 'root';
  const pass = process.env.SURREAL_PASS || 'root';

  db = new Surreal();

  try {
    console.log(`Attempting to connect to SurrealDB at ${url}...`);
    await db.connect(url);
    
    // Sign in first
    if (user && pass) {
      try {
        await db.signin({ 
          username: user, 
          password: pass 
        });
      } catch (e) {
        console.warn('SurrealDB signin failed:', (e as Error).message);
      }
    }

    await db.use({ namespace: ns, database });
    adapter = new SurrealAdapter(db);
    
    console.log(`Successfully connected to SurrealDB at ${url} (NS: ${ns}, DB: ${database})`);
    
    // Initialize Schema/Tables
    try {
      await db.query(`
        DEFINE TABLE users SCHEMALESS;
        DEFINE INDEX userEmail ON users FIELDS email UNIQUE;
        
        DEFINE TABLE places SCHEMALESS;
        DEFINE INDEX placeName ON places FIELDS name UNIQUE;
        
        DEFINE TABLE posts SCHEMALESS;
        DEFINE TABLE jobs SCHEMALESS;
        DEFINE TABLE cv_sections SCHEMALESS;
        DEFINE TABLE comments SCHEMALESS;
        DEFINE TABLE messages SCHEMALESS;
        DEFINE TABLE notifications SCHEMALESS;
        DEFINE TABLE topics SCHEMALESS;
        DEFINE TABLE skills SCHEMALESS;

        -- Relation tables (Graph Edges)
        DEFINE TABLE connects_to TYPE RELATION FROM users TO users;
        DEFINE TABLE follows_topic TYPE RELATION FROM users TO topics;
        DEFINE TABLE applies_to TYPE RELATION FROM users TO jobs;
        DEFINE TABLE tagged_with TYPE RELATION FROM posts TO topics;
        DEFINE TABLE job_tagged_with TYPE RELATION FROM jobs TO topics;
        DEFINE TABLE requires_skill TYPE RELATION FROM jobs TO skills;
        DEFINE TABLE user_has_skill TYPE RELATION FROM users TO skills;

        DEFINE TABLE user_skills SCHEMALESS;
        DEFINE TABLE portfolio SCHEMALESS;
        DEFINE TABLE files SCHEMALESS;
        DEFINE TABLE job_alerts SCHEMALESS;
      `);
    } catch (schemaErr) {
      console.warn('Schema definition skipped or failed (might already exist):', (schemaErr as Error).message);
    }

  } catch (err) {
    console.error('Failed to connect to SurrealDB:', err);
    if (process.env.NODE_ENV === 'production') throw err;
  }
}

// Seed Places (Oman Cities)
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
  const [places] = await db.query('SELECT count() FROM places GROUP ALL');
  const count = (places as any)?.[0]?.count || 0;
  
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

  const [adminCheck] = await db.query('SELECT count() as count FROM users WHERE role = "admin" GROUP ALL') as any;
  const adminExists = (adminCheck?.[0]?.count || 0) > 0;
  
  if (!adminExists) {
    console.log('System waiting for initial setup via UI (Setup Node)...');
  } else {
    console.log('Database initialized with admin presence.');
  }
}

const isAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const idRecord = userId.includes(':') ? userId : `users:${userId}`;
    const [users] = await db.query('SELECT * FROM type::record($userId)', { userId: idRecord }) as any;
    const user = users?.[0];
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

const seedDB = async (initialAdmin?: { email: string, full_name: string, passwordHash: string }) => {
  try {
    await db.query(`
      DELETE posts; DELETE jobs; DELETE cv_sections; 
      DELETE applies_to; DELETE connects_to; DELETE follows_topic;
      DELETE notifications; DELETE topics;
      DELETE user_skills; DELETE portfolio; DELETE files; DELETE job_alerts;
      DELETE post_responses; DELETE comments; DELETE messages;
    `);
    
    if (initialAdmin) {
      await db.query('DELETE users');
    } else {
      await db.query('DELETE users WHERE role != "admin"');
    }
  } catch (e) {
    console.warn('Cleanup before seed failed:', (e as Error).message);
  }
  
  const salt = bcrypt.genSaltSync(10);
  const defaultHash = bcrypt.hashSync('Password123!', salt);

  const adminUser = initialAdmin ? {
    id: 'users:admin_root',
    email: initialAdmin.email,
    full_name: initialAdmin.full_name,
    password: initialAdmin.passwordHash,
    role: 'admin',
    subscription: 'enterprise',
    headline: 'System Administrator',
    place_id: 'places:muscat'
  } : {
    id: 'users:admin',
    email: 'admin@prosync.com',
    full_name: 'System Admin',
    password: defaultHash,
    role: 'admin',
    subscription: 'enterprise',
    headline: 'Platform Administration',
    place_id: 'places:muscat'
  };

  const usersSeed = [
    adminUser,
    { id: 'users:ahmed', email: 'ahmed@muscat.om', full_name: 'Ahmed Al-Said', headline: 'Senior Software Architect', bio: 'Expert in cloud systems in Muscat.', role: 'jobseeker', subscription: 'pro', place_id: 'places:muscat', is_company_rep: 0, password: defaultHash },
    { id: 'users:recruiter', email: 'recruiter@omantel.om', full_name: 'Omantel HR', headline: 'Talent Acquisition', bio: 'Building the future of telecom in Oman.', role: 'company', subscription: 'enterprise', place_id: 'places:muscat', is_company_rep: 1, password: defaultHash },
    { id: 'users:fatima', email: 'fatima@salalah.om', full_name: 'Fatima Al-Balushi', headline: 'UX Designer', bio: 'Passionate about creating beautiful experiences.', role: 'jobseeker', subscription: 'free', place_id: 'places:salalah', is_company_rep: 0, password: defaultHash },
    { id: 'users:sohar_steel', email: 'sohar_steel@industries.om', full_name: 'Sohar Steel', headline: 'Manufacturing Excellence', bio: 'Leading industrial player in Sohar.', role: 'company', subscription: 'pro', place_id: 'places:sohar', is_company_rep: 1, password: defaultHash },
    { id: 'users:salim', email: 'salim@omaninfra.com', full_name: 'Salim Al-Harthy', headline: 'Infrastructure Lead', bio: 'Building Oman\'s digital bridge.', role: 'company', subscription: 'pro', place_id: 'places:muscat', is_company_rep: 1, password: defaultHash },
  ];

  for (const u of usersSeed) {
    const { id, place_id, ...rest } = u;
    try {
      await db.query('UPSERT type::record($id) CONTENT $data', { 
        id,
        data: { 
          ...rest, 
          place_id: toRecordId(place_id),
          created_at: new Date().toISOString(),
          profile_views: 0,
          engagement: 0,
          connections_received: 0
        } 
      });
    } catch (e) {
      console.error(`Failed to seed user ${id}:`, (e as Error).message);
    }
  }

  const jobSeed = [
    { user_id: toRecordId('users:recruiter'), title: 'Cloud Infrastructure Engineer', company_name: 'Omantel HR', place_id: toRecordId('places:muscat'), description: 'Scale our nationwide network.', salary_range: '$2k - $4k', experience_level: 'Senior', keywords: ['cloud', 'networking', 'telecom'] },
    { user_id: toRecordId('users:sohar_steel'), title: 'Mechanical Supervisor', company_name: 'Sohar Steel', place_id: toRecordId('places:sohar'), description: 'Manage production floor safety and efficiency.', salary_range: '$1.5k - $2.5k', experience_level: 'Mid', keywords: ['mechanical', 'safety', 'industries'] },
  ];
  for (const job of jobSeed) {
    try {
      await db.query('CREATE jobs CONTENT $data', { 
        data: { ...job, created_at: new Date().toISOString() } 
      });
    } catch (e) {
      console.error('Failed to seed job:', (e as Error).message);
    }
  }

  const postSeed = [
    { user_id: toRecordId('users:ahmed'), content: 'Excited to see the tech growth in Muscat lately! #OmanTech', type: 'standard', keywords: ['tech', 'muscat'] },
    { user_id: toRecordId('users:fatima'), content: 'How important is cultural context in UI design for the Gulf region?', type: 'discussion', keywords: ['design', 'culture'] },
  ];
  for (const post of postSeed) {
    try {
      await db.query('CREATE posts CONTENT $data', { 
        data: { ...post, created_at: new Date().toISOString() } 
      });
    } catch (e) {
      console.error('Failed to seed post:', (e as Error).message);
    }
  }
};

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API REQUEST] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

const apiRouter = express.Router();

apiRouter.get('/health', async (req, res) => {
  res.json({ 
    status: 'ok', 
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

apiRouter.use(async (req, res, next) => {
  console.log(`[apiRouter] ${req.method} ${req.url}`);
  if (!db) {
     try {
       await initSurreal();
     } catch (e) {
       return res.status(503).json({ error: 'Database connection failed' });
     }
  }
  next();
});

apiRouter.get('/setup/status', async (req, res) => {
  try {
    const [users] = await db.query('SELECT count() as count FROM users WHERE role = "admin" GROUP ALL') as any;
    const count = users?.[0]?.count || 0;
    res.json({ initialized: count > 0 });
  } catch (err) {
    res.json({ initialized: false });
  }
});

apiRouter.post('/setup/init', async (req, res) => {
  const { email, password, fullName, seed } = req.body;
  try {
    const [existing] = await db.query('SELECT count() as count FROM users WHERE role = "admin" GROUP ALL') as any;
    if (existing?.[0]?.count > 0) {
      return res.status(403).json({ error: 'System already initialized. Setup is locked.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    
    if (seed) {
      await seedDB({ email, full_name: fullName, passwordHash: hash });
    } else {
      const adminId = `users:admin_${Date.now()}`;
      await db.query('CREATE type::record($id) CONTENT $data', {
        id: adminId,
        data: {
          email,
          full_name: fullName,
          role: 'admin',
          password: hash,
          subscription: 'enterprise',
          created_at: new Date().toISOString(),
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`,
          headline: 'System Administrator'
        }
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.post('/admin/seed', isAdmin, async (req, res) => {
  try {
    await seedDB();
    res.json({ success: true, message: 'Database seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.get('/auth/me', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const idRecord = userId.includes(':') ? userId : `users:${userId}`;
    const [users] = await db.query('SELECT * FROM type::record($userId)', { userId: idRecord }) as any;
    const user = users?.[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ...user, id: stringId(user.id) });
  } catch (err) {
    res.status(401).json({ error: 'Session invalid' });
  }
});

apiRouter.get('/admin/content/posts', isAdmin, async (req, res) => {
  try {
    const [posts] = await db.query('SELECT *, user_id.* as user FROM posts ORDER BY created_at DESC LIMIT 1000') as any;
    res.json((posts || []).map((p: any) => ({ ...p, id: stringId(p.id), user: p.user ? { ...p.user, id: stringId(p.user.id) } : undefined })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.get('/admin/content/jobs', isAdmin, async (req, res) => {
  try {
    const [jobs] = await db.query('SELECT *, user_id.* as user FROM jobs ORDER BY created_at DESC LIMIT 1000') as any;
    res.json((jobs || []).map((j: any) => ({ ...j, id: stringId(j.id), user: j.user ? { ...j.user, id: stringId(j.user.id) } : undefined })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.get('/admin/content/topics', isAdmin, async (req, res) => {
  try {
    const [topics] = await db.query('SELECT * FROM topics ORDER BY name ASC LIMIT 1000') as any;
    res.json((topics || []).map((t: any) => ({ ...t, id: stringId(t.id) })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.post('/admin/seed/generate', isAdmin, async (req, res) => {
  const { count = 5 } = req.body;
  const num = Math.min(parseInt(count.toString()), 50);
  
  try {
    const [users] = await db.query('SELECT id FROM users WHERE role != "admin" LIMIT 10') as any;
    if (!users || users.length === 0) throw new Error("No non-admin users found to associate content with.");
    
    const results = [];
    for(let i = 0; i < num; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      
      // Generate Job
      const description = `## Job Overview\nThis is a *generated* test job description for item ${i + 1}.\n\n### Requirements\n- Seed requirement A\n- Seed requirement B\n\n### Skills Needed\n[React] [TypeScript] [Node.js]\n\nJoin our Omani team today! #OmanJobs #Tech #HiringOman`;
      const [newJob] = await db.query('CREATE jobs CONTENT $data', {
        data: {
          title: `Seed Job ${i + 1}`,
          company_name: `Seed Co ${i + 1}`,
          description,
          salary_range: `$${1000 + i * 100} - $${2000 + i * 100}`,
          experience_level: i % 2 === 0 ? 'Senior' : 'Junior',
          place_id: toRecordId('places:muscat'),
          user_id: user.id,
          created_at: new Date().toISOString(),
          is_seed: true
        }
      }) as any;
      const jobId = newJob[0].id;
      await processJobMetadata(jobId, description);
      results.push(newJob);

      // Generate Post
      const post = await db.query('CREATE posts CONTENT $data', {
        data: {
          content: `## Community Update #${i + 1}\n\nThis is an automated seed post exploring the professional landscape in Oman. \n\n- **Topic**: Professional Networking\n- **Impact**: High\n\n#SeedContent #Automated #ProSyncOman`,
          type: i % 3 === 0 ? 'discussion' : 'standard',
          user_id: user.id,
          created_at: new Date().toISOString(),
          is_seed: true
        }
      });
      results.push(post);
    }
    
    res.json({ success: true, count: results.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.post('/admin/seed/clear', isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM posts WHERE is_seed = true');
    await db.query('DELETE FROM jobs WHERE is_seed = true');
    res.json({ success: true, message: 'Seed content cleared' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.get('/admin/analytics', isAdmin, async (req, res) => {
  try {
    const [users] = await db.query('SELECT count() as count FROM users GROUP ALL');
    const [posts] = await db.query('SELECT count() as count FROM posts GROUP ALL');
    const [jobs] = await db.query('SELECT count() as count FROM jobs GROUP ALL');
    const [subs] = await db.query('SELECT subscription, count() as count FROM users GROUP BY subscription');
    const [roles] = await db.query('SELECT role, count() as count FROM users GROUP BY role');

    res.json({
      users: (users as any)?.[0] || { count: 0 },
      posts: (posts as any)?.[0] || { count: 0 },
      jobs: (jobs as any)?.[0] || { count: 0 },
      subs: subs || [],
      roles: roles || []
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.get('/admin/users', isAdmin, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, full_name, email, role, subscription FROM users') as any;
    res.json((users || []).map((u: any) => ({ ...u, id: stringId(u.id) })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.post('/admin/update-subscription', isAdmin, async (req, res) => {
  const { userId, subscription } = req.body;
  try {
    await adapter.update('users', userId, { subscription });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.get('/places', async (req, res) => {
  try {
    const places = await adapter.list('places') as any[];
    res.json(places.map((p: any) => ({ ...p, id: stringId(p.id) })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.post('/auth/check-email', async (req, res) => {
  const { email } = req.body;
  const [user] = await db.query('SELECT id FROM users WHERE email = $email', { email }) as any;
  res.json({ exists: !!(user?.[0]) });
});

apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const [users] = await db.query('SELECT * FROM users WHERE email = $email', { email }) as any;
  const user = users?.[0];
  if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const { password: _, ...userWithoutPassword } = user;
  res.json({ ...userWithoutPassword, id: stringId(user.id) });
});

apiRouter.post('/auth/register', async (req, res) => {
  const { email, password, full_name } = req.body;
  const [existing] = await db.query('SELECT id FROM users WHERE email = $email', { email }) as any;
  if (existing?.[0]) return res.status(400).json({ error: 'Email already registered' });
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  try {
    const user = await adapter.insert<any>('users', {
      email, full_name, password: hash, headline: 'Professional Individual',
      subscription: 'free', role: 'jobseeker', created_at: new Date().toISOString(),
      profile_views: 0, engagement: 0, connections_received: 0
    });
    const { password: _, ...u } = user;
    res.json({ ...u, id: stringId(user.id) });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

apiRouter.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const [user] = await db.query('SELECT id FROM users WHERE email = $email', { email }) as any;
  if (!user?.[0]) return res.status(404).json({ error: 'No user found' });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await db.query('DELETE FROM otps WHERE email = $email', { email });
  await db.query('CREATE otps CONTENT $data', { data: { email, otp, expires_at: new Date(Date.now() + 600000).toISOString() } });
  console.log(`[AUTH] OTP for ${email}: ${otp}`);
  res.json({ success: true, debug_otp: otp });
});

apiRouter.post('/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const [records] = await db.query('SELECT * FROM otps WHERE email = $email AND otp = $otp', { email, otp }) as any;
  const record = records?.[0];
  if (!record || new Date(record.expires_at) < new Date()) return res.status(401).json({ error: 'Invalid OTP' });
  res.json({ success: true });
});

apiRouter.post('/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const [records] = await db.query('SELECT * FROM otps WHERE email = $email AND otp = $otp', { email, otp }) as any;
  const record = records?.[0];
  if (!record || new Date(record.expires_at) < new Date()) return res.status(401).json({ error: 'Invalid OTP' });
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.query('UPDATE users SET password = $hash WHERE email = $email', { hash, email });
  await db.query('DELETE FROM otps WHERE email = $email', { email });
  res.json({ success: true });
});

apiRouter.get('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  const idRecord = userId.includes(':') ? userId : `users:${userId}`;
  const [notifications] = await db.query('SELECT * FROM notifications WHERE user_id = type::record($userId) ORDER BY created_at DESC LIMIT 20', { userId: idRecord }) as any;
  res.json((notifications || []).map((n: any) => ({ ...n, id: stringId(n.id) })));
});

apiRouter.post('/notifications/read', async (req, res) => {
  await db.query('UPDATE type::record($id) MERGE $data', { id: req.body.notificationId, data: { is_read: 1 } });
  res.json({ success: true });
});

apiRouter.get('/connections/status/:userId/:targetId', async (req, res) => {
  const { userId, targetId } = req.params;
  const uId = toRecordId(userId, 'users');
  const tId = toRecordId(targetId, 'users');
  
  // Use graph traversal to check connection
  const [connection] = await db.query('SELECT count() FROM connects_to WHERE in = $uId AND out = $tId', { uId, tId }) as any;
  const isConnected = (connection?.[0]?.count || 0) > 0;
  res.json({ connected: isConnected });
});

apiRouter.post('/connections', async (req, res) => {
  const { user_id, target_id } = req.body;
  const uId = toRecordId(user_id, 'users');
  const tId = toRecordId(target_id, 'users');
  
  // Use RELATE for graph connection with RecordId objects
  await db.query('RELATE $uId->connects_to->$tId SET status = "accepted", created_at = time::now()', { uId, tId });
  await adapter.increment('users', target_id, 'connections_received', 1);
  res.json({ success: true });
});

apiRouter.delete('/connections/:userId/:targetId', async (req, res) => {
  const { userId, targetId } = req.params;
  const uId = toRecordId(userId, 'users');
  const tId = toRecordId(targetId, 'users');
  
  await db.query('DELETE connects_to WHERE in = $uId AND out = $tId', { uId, tId });
  res.json({ success: true });
});

apiRouter.get('/topics', async (req, res) => {
  const { userId } = req.query;
  const uIdRec = toRecordId(userId, 'users');

  try {
    if (uIdRec) {
      // Deeper Graph Suggestions: 
      // 1. Topics followed by L1 and L2 connections
      // 2. Topics followed by people who follow the same topics as you
      const [graphTopics] = await db.query(`
        LET $myFriends = (SELECT VALUE out FROM connects_to WHERE in = $userId);
        LET $friendsOfFriends = (SELECT VALUE out FROM connects_to WHERE in IN $myFriends);
        LET $myTopics = (SELECT VALUE out FROM follows_topic WHERE in = $userId);
        LET $similarPeople = (SELECT VALUE in FROM follows_topic WHERE out IN $myTopics AND in != $userId);

        SELECT out.name as name, count() as weight 
        FROM follows_topic 
        WHERE in IN ($myFriends UNION $friendsOfFriends UNION $similarPeople)
        AND out NOT IN $myTopics
        GROUP BY name 
        ORDER BY weight DESC 
        LIMIT 10
      `, { userId: uIdRec }) as any;
      
      if (graphTopics && graphTopics.length > 0) {
        return res.json(graphTopics.map((t: any) => `#${t.name}`));
      }
    }

    // Fallback: Global trending topics from posts
    const [posts] = await db.query('SELECT content FROM posts ORDER BY created_at DESC LIMIT 200') as any;
    const tags: Record<string, number> = {};
    posts?.forEach((p: any) => p.content?.match(/#[a-z0-9_]+/gi)?.forEach((t: string) => tags[t] = (tags[t] || 0) + 1));
    res.json(Object.entries(tags).sort((a,b) => b[1]-a[1]).slice(0, 8).map(e => e[0]));
  } catch (err) {
    res.json([]);
  }
});

apiRouter.get('/topics/followed/:userId', async (req, res) => {
  const { userId } = req.params;
  const idRecord = toRecordId(userId, 'users');
  const [topics] = await db.query('SELECT out.name as name FROM follows_topic WHERE in = $userId', { userId: idRecord }) as any;
  res.json((topics || []).map((t: any) => t.name));
});

apiRouter.post('/topics/follow', async (req, res) => {
  const { user_id, topic } = req.body;
  const uId = toRecordId(user_id, 'users');
  const topicName = topic.startsWith('#') ? topic.slice(1) : topic;
  const topicId = toRecordId(topicName, 'topics');
  
  // Ensure topic exists
  await db.query('UPSERT $topicId SET name = $name', { topicId, name: topicName });
  // Relate
  await db.query('RELATE $uId->follows_topic->$topicId SET created_at = time::now()', { uId, topicId });
  res.json({ success: true });
});

apiRouter.post('/topics/unfollow', async (req, res) => {
  const { user_id, topic } = req.body;
  const uId = toRecordId(user_id, 'users');
  const topicName = topic.startsWith('#') ? topic.slice(1) : topic;
  const topicId = toRecordId(topicName, 'topics');
  
  await db.query('DELETE follows_topic WHERE in = $uId AND out = $topicId', { uId, topicId });
  res.json({ success: true });
});

apiRouter.get('/jobs', async (req, res) => {
  const { q, placeId, experience } = req.query;
  let query = 'SELECT *, place_id.name as place_name, (SELECT VALUE out.name FROM requires_skill WHERE in = $parent.id) as skills, (SELECT VALUE out.name FROM job_tagged_with WHERE in = $parent.id) as topics FROM jobs WHERE 1=1';
  const params: any = {};
  if (q) { query += ' AND (title ~ $q OR description ~ $q OR company_name ~ $q)'; params.q = q; }
  if (placeId && placeId !== 'all') { query += ' AND place_id = type::record($placeId)'; params.placeId = placeId.toString().includes(':') ? placeId : `places:${placeId}`; }
  if (experience && experience !== 'all') { query += ' AND experience_level = $experience'; params.experience = experience; }
  query += ' ORDER BY created_at DESC';
  const [jobs] = await db.query(query, params) as any;
  res.json((jobs || []).map((j: any) => ({ ...j, id: stringId(j.id) })));
});

// Helper to extract and relate topics/skills from job content
const processJobMetadata = async (jobId: RecordId, description: string) => {
  // Extract topics (#hashtag)
  const topics = description.match(/#[a-z0-9_]+/gi);
  if (topics && topics.length > 0) {
    for (const t of topics) {
      const topicName = t.startsWith('#') ? t.slice(1).toLowerCase() : t.toLowerCase();
      const topicId = toRecordId(topicName, 'topics');
      if (topicId) {
        await db.query('UPSERT $topicId SET name = $name', { topicId, name: topicName });
        await db.query('RELATE $jobId->job_tagged_with->$topicId SET created_at = time::now()', { jobId, topicId });
      }
    }
  }

  // Extract skills ([SkillName])
  const skills = description.match(/\[[a-z0-9_ \-\.]+\]/gi);
  if (skills && skills.length > 0) {
    for (const s of skills) {
      const skillName = s.slice(1, -1).trim();
      const skillSlug = skillName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const skillId = toRecordId(skillSlug, 'skills');
      if (skillId) {
        await db.query('UPSERT $skillId SET name = $name', { skillId, name: skillName });
        await db.query('RELATE $jobId->requires_skill->$skillId SET created_at = time::now()', { jobId, skillId });
      }
    }
  }
};

apiRouter.post('/jobs', async (req, res) => {
  const { user_id, ...rest } = req.body;
  const description = rest.description || "";
  const [users] = await db.query('SELECT * FROM type::record($userId)', { userId: user_id }) as any;
  const user = users?.[0];
  if (!user || (user.is_company_rep !== 1 && user.role !== 'company')) return res.status(403).json({ error: 'Permission denied' });
  
  const [newJob] = await db.query('CREATE jobs CONTENT $data', { 
    data: { ...rest, user_id: toRecordId(user_id), created_at: new Date().toISOString() } 
  }) as any;
  
  const jobId = newJob[0].id;
  await processJobMetadata(jobId, description);

  res.json({ success: true, id: stringId(jobId) });
});

apiRouter.get('/jobs/:jobId/applicants', async (req, res) => {
  const [applicants] = await db.query('SELECT *, in.* as user FROM applies_to WHERE out = type::record($jobId) ORDER BY created_at DESC', { jobId: req.params.jobId }) as any;
  res.json((applicants || []).map((ap: any) => ({ ...ap, user: ap.user ? { ...ap.user, id: stringId(ap.user.id) } : undefined })));
});

apiRouter.post('/jobs/applications/status', async (req, res) => {
  await db.query('UPDATE applies_to SET status = $status WHERE id = type::record($id)', { id: req.body.applicationId, status: req.body.status });
  res.json({ success: true });
});

apiRouter.get('/search', async (req, res) => {
  const { q, type } = req.query;
  const term = q as string;
  const results: any = { posts: [], jobs: [], users: [] };
  if (!type || type === 'posts' || type === 'all') {
    const posts = await adapter.search<any>('posts', term, ['content']);
    results.posts = await Promise.all((posts || []).map(async (p: any) => {
      const user = await adapter.get<any>('users', stringId(p.user_id));
      return { ...p, id: stringId(p.id), user: user ? { ...user, id: stringId(user.id) } : undefined };
    }));
  }
  if (!type || type === 'jobs' || type === 'all') {
    results.jobs = await adapter.search<any>('jobs', term, ['title', 'company_name', 'description']);
    results.jobs = results.jobs.map((j: any) => ({ ...j, id: stringId(j.id) }));
  }
  if (!type || type === 'users' || type === 'all' || type === 'companies') {
    let users = await adapter.search<any>('users', term, ['full_name', 'headline']);
    if (type === 'companies') users = users.filter(u => u.role === 'company');
    results.users = users.map((u: any) => ({ ...u, id: stringId(u.id) }));
  }
  res.json(results);
});

apiRouter.post('/jobs/apply', async (req, res) => {
  const { user_id, job_id, attachment_type, attachment_id } = req.body;
  const uId = toRecordId(user_id, 'users');
  const jId = toRecordId(job_id, 'jobs');
  const aId = toRecordId(attachment_id);
  
  await db.query(`
    RELATE $uId->applies_to->$jId 
    SET attachment_type = $attachment_type, 
        attachment_id = $aId, 
        status = "pending", 
        created_at = time::now()
  `, { uId, jId, attachment_type, aId });
  
  res.json({ success: true });
});

apiRouter.get('/job-alerts/:userId', async (req, res) => {
  const [alerts] = await db.query('SELECT * FROM job_alerts WHERE user_id = type::record($userId)', { userId: req.params.userId.includes(':') ? req.params.userId : `users:${req.params.userId}` }) as any;
  res.json(alerts || []);
});

apiRouter.post('/job-alerts', async (req, res) => {
  const { user_id, ...rest } = req.body;
  await db.query('CREATE job_alerts CONTENT $data', { data: { ...rest, user_id: toRecordId(user_id), created_at: new Date().toISOString() } });
  res.json({ success: true });
});

apiRouter.delete('/job-alerts/:alertId', async (req, res) => {
  await db.query('DELETE type::record($id)', { id: req.params.alertId });
  res.json({ success: true });
});

apiRouter.get('/messages/conversations/:userId', async (req, res) => {
  const { userId } = req.params;
  const uId = userId.includes(':') ? userId : `users:${userId}`;
  const [messages] = await db.query('SELECT sender_id, receiver_id FROM messages WHERE sender_id = type::record($uId) OR receiver_id = type::record($uId)', { uId }) as any;
  const others = new Set<string>();
  messages?.forEach((m: any) => { if (stringId(m.sender_id) !== uId) others.add(stringId(m.sender_id)); if (stringId(m.receiver_id) !== uId) others.add(stringId(m.receiver_id)); });
  const conversations = [];
  for (const oId of Array.from(others)) {
    const [u] = await db.query('SELECT * FROM type::record($id)', { id: oId }) as any;
    if (u?.[0]) {
      const [lastMsgs] = await db.query('SELECT content, created_at FROM messages WHERE (sender_id = type::record($uId) AND receiver_id = type::record($oId)) OR (sender_id = type::record($oId) AND receiver_id = type::record($uId)) ORDER BY created_at DESC LIMIT 1', { uId, oId }) as any;
      conversations.push({ id: stringId(u[0].id), full_name: u[0].full_name, avatar_url: u[0].avatar_url, last_message: lastMsgs?.[0]?.content, last_message_time: lastMsgs?.[0]?.created_at });
    }
  }
  res.json(conversations.sort((a,b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()));
});

apiRouter.get('/messages/:userId/:targetId', async (req, res) => {
  const uId = req.params.userId.includes(':') ? req.params.userId : `users:${req.params.userId}`;
  const tId = req.params.targetId.includes(':') ? req.params.targetId : `users:${req.params.targetId}`;
  await db.query('UPDATE messages SET is_read = 1 WHERE sender_id = type::record($tId) AND receiver_id = type::record($uId)', { uId, tId });
  const [messages] = await db.query('SELECT * FROM messages WHERE (sender_id = type::record($uId) AND receiver_id = type::record($tId)) OR (sender_id = type::record($tId) AND receiver_id = type::record($uId)) ORDER BY created_at ASC', { uId, tId }) as any;
  res.json((messages || []).map((m: any) => ({ ...m, id: stringId(m.id) })));
});

apiRouter.post('/messages', async (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  await db.query('CREATE messages CONTENT $data', { data: { sender_id: toRecordId(sender_id), receiver_id: toRecordId(receiver_id), is_read: 0, content, created_at: new Date().toISOString() } });
  res.json({ success: true });
});

apiRouter.get('/content', async (req, res) => {
  const { userId } = req.query;
  let query = 'SELECT *, user_id.* as user, (SELECT count() FROM comments WHERE post_id = $parent.id GROUP ALL)[0].count as comment_count FROM posts';
  const params: any = {};
  if (userId) { query += ' WHERE user_id = type::record($userId)'; params.userId = userId; }
  query += ' ORDER BY created_at DESC';
  try {
    const [posts] = await db.query(query, params) as any;
    res.json((posts || []).map((p: any) => ({ ...p, id: stringId(p.id), user: p.user ? { ...p.user, id: stringId(p.user.id) } : undefined })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.get('/profile/:userId', async (req, res) => {
  const idRecord = req.params.userId.includes(':') ? req.params.userId : `users:${req.params.userId}`;
  try {
    const [users] = await db.query('SELECT * FROM type::record($id)', { id: idRecord }) as any;
    const user = users?.[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [cv] = await db.query('SELECT * FROM cv_sections WHERE user_id = type::record($id) ORDER BY start_date DESC', { id: idRecord }) as any;
    const [skills] = await db.query('SELECT * FROM user_skills WHERE user_id = type::record($id)', { id: idRecord }) as any;
    const [portfolio] = await db.query('SELECT * FROM portfolio WHERE user_id = type::record($id)', { id: idRecord }) as any;
    const [jobs] = (user.is_company_rep || user.role === 'company' ? await db.query('SELECT * FROM jobs WHERE user_id = type::record($id) ORDER BY created_at DESC', { id: idRecord }) : [[]]) as any[];
    
    // Fetch connections count and followed topics using graph traversals
    const [countsResult] = await db.query(`
      SELECT 
        (SELECT count() FROM connects_to WHERE out = $parent.id GROUP ALL)[0].count as connections_count,
        (SELECT VALUE out.name FROM follows_topic WHERE in = $parent.id) as followed_topics
      FROM users WHERE id = type::record($id)
    `, { id: idRecord }) as any;
    const counts = countsResult?.[0];

    res.json({ 
      ...user, id: stringId(user.id), 
      cv: (cv || []).map((c: any) => ({ ...c, id: stringId(c.id) })),
      skills: (skills || []).map((s: any) => ({ ...s, id: stringId(s.id) })),
      portfolio: (portfolio || []).map((p: any) => ({ ...p, id: stringId(p.id) })),
      jobs: (jobs || []).map((j: any) => ({ ...j, id: stringId(j.id) })),
      connections_count: counts?.connections_count || 0,
      followed_topics: counts?.followed_topics || []
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

apiRouter.post('/cv', async (req, res) => {
  const { user_id, ...rest } = req.body;
  const [section] = await db.query('CREATE cv_sections CONTENT $data', { data: { ...rest, user_id: toRecordId(user_id), created_at: new Date().toISOString() } }) as any;
  res.json({ success: true, id: stringId(section.id) });
});

apiRouter.put('/profile', async (req, res) => {
  const { user_id, ...data } = req.body;
  await db.query('UPDATE type::record($id) MERGE $data', { id: user_id.includes(':') ? user_id : `users:${user_id}`, data });
  res.json({ success: true });
});

apiRouter.post('/skills', async (req, res) => {
  const { user_id, name, proficiency } = req.body;
  await db.query('CREATE user_skills CONTENT $data', { data: { user_id: toRecordId(user_id), name, proficiency } });
  res.json({ success: true });
});

apiRouter.post('/posts', async (req, res) => {
  const { user_id, ...rest } = req.body;
  const content = rest.content || "";
  const post = await adapter.insert<any>('posts', { ...rest, user_id: toRecordId(user_id), created_at: new Date().toISOString() });
  const postId = post.id;

  // Extract topics (hashtags)
  const topics = content.match(/#[a-z0-9_]+/gi);
  if (topics && topics.length > 0) {
    for (const t of topics) {
      const topicName = t.startsWith('#') ? t.slice(1).toLowerCase() : t.toLowerCase();
      const topicId = toRecordId(topicName, 'topics');
      if (topicId) {
        // Ensure topic exists
        await db.query('UPSERT $topicId SET name = $name', { topicId, name: topicName });
        // Relate post to topic
        await db.query('RELATE $postId->tagged_with->$topicId SET created_at = time::now()', { postId, topicId });
      }
    }
  }

  res.json({ success: true, id: stringId(postId) });
});

apiRouter.get('/posts/:postId/comments', async (req, res) => {
  const [results] = await db.query('SELECT *, user_id.* as user FROM comments WHERE post_id = $postId ORDER BY created_at ASC', { postId: req.params.postId }) as any;
  res.json((results || []).map((c: any) => ({ ...c, id: stringId(c.id), user: c.user ? { ...c.user, id: stringId(c.user.id) } : undefined })));
});

apiRouter.post('/comments', async (req, res) => {
  const { user_id, post_id, ...rest } = req.body;
  await db.query('CREATE comments CONTENT $data', { data: { ...rest, user_id: toRecordId(user_id), post_id: toRecordId(post_id), created_at: new Date().toISOString() } });
  res.json({ success: true });
});

apiRouter.get('/candidates', async (req, res) => {
  const { skills } = req.query;
  let query = 'SELECT *, (SELECT VALUE name FROM user_skills WHERE user_id = $parent.id) as skill_list FROM users WHERE role = "jobseeker"';
  const params: any = {};
  if (skills) { query += ' AND (SELECT count() FROM user_skills WHERE user_id = $parent.id AND name IN $skillArr)[0].count > 0'; params.skillArr = (skills as string).split(','); }
  const [users] = await db.query(query, params) as any;
  res.json((users || []).map((u: any) => ({ ...u, id: stringId(u.id) })));
});

apiRouter.get('/recommendations/:userId?', async (req, res) => {
  const { userId } = req.params;
  const idRecord = toRecordId(userId, 'users');
  
  try {
    if (idRecord) {
      // 1. Friend-of-Friend Suggestions (Level 2 connections)
      // 2. People following the same topics
      const [suggestions] = await db.query(`
        LET $myFriends = (SELECT VALUE out FROM connects_to WHERE in = $userId);
        LET $myTopics = (SELECT VALUE out FROM follows_topic WHERE in = $userId);
        
        SELECT id, full_name, headline, avatar_url, role, 
               (SELECT count() FROM connects_to WHERE in = $parent.id AND out IN $myFriends) as mutual_count
        FROM users 
        WHERE id != $userId 
        AND id NOT IN $myFriends
        AND (
          id IN (SELECT VALUE out FROM connects_to WHERE in IN $myFriends)
          OR 
          id IN (SELECT VALUE in FROM follows_topic WHERE out IN $myTopics)
        )
        ORDER BY mutual_count DESC
        LIMIT 6
      `, { userId: idRecord }) as any;

      if (suggestions && suggestions.length > 0) {
        return res.json(suggestions.map((r: any) => ({ ...r, id: stringId(r.id) })));
      }
    }

    // Global Fallback
    let query = 'SELECT id, full_name, headline, avatar_url, role FROM users WHERE role != "admin"';
    const params: any = {};
    if (idRecord) { query += ' AND id != $userId'; params.userId = idRecord; }
    query += ' LIMIT 6';
    const [recs] = await db.query(query, params) as any;
    res.json((recs || []).map((r: any) => ({ ...r, id: stringId(r.id) })));
  } catch (err) {
    res.json([]);
  }
});

apiRouter.get('/files/:userId', async (req, res) => {
  const [files] = await db.query('SELECT * FROM files WHERE user_id = type::record($userId) ORDER BY created_at DESC', { userId: req.params.userId.includes(':') ? req.params.userId : `users:${req.params.userId}` }) as any;
  res.json(files || []);
});

apiRouter.post('/files', async (req, res) => {
  const { user_id, ...rest } = req.body;
  const [file] = await db.query('CREATE files CONTENT $data', { data: { ...rest, user_id: toRecordId(user_id), created_at: new Date().toISOString() } }) as any;
  res.json({ success: true, id: stringId(file.id) });
});

apiRouter.delete('/files/:fileId', async (req, res) => {
  await db.query('DELETE type::record($id)', { id: req.params.fileId });
  res.json({ success: true });
});

apiRouter.delete('/posts/:postId', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Auth required' });
  const [post] = await db.query('SELECT user_id FROM type::record($id)', { id: req.params.postId }) as any;
  if (!post?.[0]) return res.status(404).json({ error: 'Post not found' });
  if (stringId(post[0].user_id) !== String(userId)) return res.status(403).json({ error: 'Unauthorized' });
  await db.query('DELETE type::record($id)', { id: req.params.postId });
  res.json({ success: true });
});

apiRouter.put('/posts/:postId', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Auth required' });
  const [post] = await db.query('SELECT user_id FROM type::record($id)', { id: req.params.postId }) as any;
  if (!post?.[0]) return res.status(404).json({ error: 'Post not found' });
  if (stringId(post[0].user_id) !== String(userId)) return res.status(403).json({ error: 'Unauthorized' });
  await db.query('UPDATE type::record($id) SET content = $content', { id: req.params.postId, content: req.body.content });
  res.json({ success: true });
});

apiRouter.post('/admin/seed-jobs', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const [user] = await db.query('SELECT role FROM type::record($id)', { id: userId?.toString().includes(':') ? userId : `users:${userId}` }) as any;
  if (user?.[0]?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const [companies] = await db.query('SELECT id, full_name as company_name FROM users WHERE role = "company" LIMIT 5') as any;
  if (!companies?.length) return res.status(400).json({ error: 'No companies' });
  const seedJobs = [
    { title: 'Senior Software Engineer', location: 'Muscat, Oman', salary: '$5,000 - $8,000', experience: '5+ years' },
    { title: 'Project Manager', location: 'Salalah, Oman', salary: '$4,000 - $6,000', experience: '3+ years' },
  ];
  for (const job of seedJobs) {
    const company = companies[Math.floor(Math.random() * companies.length)];
    await db.query('CREATE jobs SET user_id = $userId, title = $title, company_name = $company, location = $location, description = "Join us!", salary_range = $salary, experience_level = $exp, end_date = time::now() + 30d, created_at = time::now()', {
      userId: company.id, title: job.title, company: company.company_name, location: job.location, salary: job.salary, exp: job.experience
    });
  }
  res.json({ success: true });
});

apiRouter.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Server Error' });
});

apiRouter.use((req, res) => {
  console.warn(`[404] API route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not Found' });
});

app.use('/api', apiRouter);

if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = 3000;

async function start() {
  await initSurreal();
  await setupDatabase();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (import.meta.main || process.env.NODE_ENV === 'production') {
  start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app };
export default app;
