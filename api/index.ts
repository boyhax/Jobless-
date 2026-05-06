import express from 'express';
import 'dotenv/config';
import 'express-async-errors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Surreal, RecordId } from 'surrealdb';
import { SurrealAdapter, IDBAdapter } from '../src/lib/db.js';
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

async function initSurreal() {
  const url = process.env.SURREAL_URL || 'http://127.0.0.1:8000';
  const ns = process.env.SURREAL_NS || 'test';
  const database = process.env.SURREAL_DB || 'test';
  const user = process.env.SURREAL_USER || 'root';
  const pass = process.env.SURREAL_PASS || 'root';

  db = new Surreal();

  try {
    console.log(`Attempting to connect to SurrealDB at ${url}...`);
    await db.connect(url);
    await db.use({ namespace: ns, database });
    adapter = new SurrealAdapter(db);
    
    // Sign in
    if (user && pass) {
      if (user === 'root' && pass === 'root') {
        // Many local setups work without explicit signin if running in dev mode
        // but we'll try anyway if provided
      }
      try {
        await db.signin({ username: user, password: pass });
      } catch (e) {
        console.warn('SurrealDB signin skipped or failed (might be in guest mode or already authenticated):', (e as Error).message);
      }
    }
    
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
        DEFINE TABLE job_applications SCHEMALESS;
        DEFINE TABLE connections SCHEMALESS;
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
    // In dev, we continue so the server starts. In prod, we fail.
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

async function setupDatabase() {
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

  // Check if seeding is needed by checking for the admin user specifically
  const [adminCheck] = await db.query('SELECT count() as count FROM users WHERE role = "admin" GROUP ALL') as any;
  const adminExists = (adminCheck?.[0]?.count || 0) > 0;
  console.log(`System Admin check: ${adminExists ? 'FOUND' : 'MISSING'}`);
  
  if (!adminExists) {
    console.log('System waiting for initial setup via UI (Setup Node)...');
  } else {
    console.log('Database initialized with admin presence.');
  }

  // Debug: list all users
  try {
    const [allUsers] = await db.query('SELECT email, role FROM users') as any;
    console.log('Available users in DB:', allUsers?.map((u: any) => `${u.email} (${u.role})`).join(', ') || 'NONE');
  } catch (e) {
    console.warn('Failed to list users during startup');
  }
}

// Midleware for RBAC
const isAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const idRecord = userId.includes(':') ? userId : `users:${userId}`;
    const [users] = await db.query('SELECT * FROM type::record($userId)', { userId: idRecord }) as any;
    const user = users?.[0];
    if (!user) {
      console.warn(`Admin check failed: user ${idRecord} not found`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (user.role !== 'admin') {
      console.warn(`Admin access denied for user ${idRecord} (role: ${user.role})`);
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  } catch (e) {
    console.error('Admin check error:', e);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

  // Seed Data
  const seedDB = async (initialAdmin?: { email: string, full_name: string, passwordHash: string }) => {
    console.log('Seeding database with fresh data...');
    try {
      // Clear existing data except the admin if we are re-seeding
      // If initialAdmin is provided, we wipe everything including existing users
      await db.query(`
        DELETE posts; DELETE jobs; DELETE cv_sections; 
        DELETE job_applications; DELETE connections; DELETE notifications;
        DELETE user_skills; DELETE portfolio; DELETE files; DELETE job_alerts;
        DELETE post_responses; DELETE comments; DELETE messages;
      `);
      
      if (initialAdmin) {
        await db.query('DELETE users');
      } else {
        // If just re-seeding, keep admins
        await db.query('DELETE users WHERE role != "admin"');
      }
    } catch (e) {
      console.warn('Cleanup before seed failed:', (e as Error).message);
    }
    
    const salt = bcrypt.genSaltSync(10);
    const defaultHash = bcrypt.hashSync('Password123!', salt);

    // Initial Admin or Default Admin
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

    // Seed Jobs
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

    // Seed Posts
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
    console.log('Database seeding completed.');
  };

const app = express();
const PORT = 3000;

app.use(express.json());

// --- REQUEST LOGGING ---
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API REQUEST] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

const apiRouter = express.Router();

// Health
apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));

// Middleware to ensure DB is connected
apiRouter.use(async (req, res, next) => {
  if (!db) {
     try {
       await initSurreal();
     } catch (e) {
       return res.status(503).json({ error: 'Database connection failed' });
     }
  }
  next();
});

// Setup & Migration
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
      // Re-verify that no admin exists
      const [existing] = await db.query('SELECT count() as count FROM users WHERE role = "admin" GROUP ALL') as any;
      if (existing?.[0]?.count > 0) {
        return res.status(403).json({ error: 'System already initialized. Setup is locked.' });
      }

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      
      if (seed) {
        console.log('Setup: Seeding database with custom admin credentials...');
        await seedDB({ email, full_name: fullName, passwordHash: hash });
      } else {
        // Create manual single admin if no seed
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

      res.json({ success: true, message: 'System initialized successfully' });
    } catch (err) {
      console.error('Setup initialization error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Admin Endpoints
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

  apiRouter.post('/admin/seed', isAdmin, async (req, res) => {
    try {
      await seedDB();
      res.json({ success: true, message: 'Database re-seeded successfully' });
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

      const stats = {
        users: (users as any)?.[0] || { count: 0 },
        posts: (posts as any)?.[0] || { count: 0 },
        jobs: (jobs as any)?.[0] || { count: 0 },
        subs: subs || [],
        roles: roles || []
      };
      res.json(stats);
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

  // Places
  apiRouter.get('/places', async (req, res) => {
    try {
      const places = await adapter.list('places') as any[];
      res.json(places.map((p: any) => ({ ...p, id: stringId(p.id) })));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Real Auth Endpoints
  apiRouter.post('/auth/check-email', async (req, res) => {
    const { email } = req.body;
    const [user] = await db.query('SELECT id FROM users WHERE email = $email', { email }) as any;
    res.json({ exists: !!(user?.[0]) });
  });

  apiRouter.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE email = $email', { email }) as any;
    const user = users?.[0];
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'This user has no password set. Please use Forgot Password.' });
    }

    const isPassValid = bcrypt.compareSync(password, user.password);
    if (!isPassValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Don't send password hash back
    const { password: _, ...userWithoutPassword } = user;
    // Normalize ID to string
    res.json({ ...userWithoutPassword, id: stringId(user.id) });
  });

  apiRouter.post('/auth/register', async (req, res) => {
    const { email, password, full_name } = req.body;
    
    const [existing] = await db.query('SELECT id FROM users WHERE email = $email', { email }) as any;
    if (existing?.[0]) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    try {
      const user = await adapter.insert<any>('users', {
        email,
        full_name,
        password: hash,
        headline: 'Professional Individual',
        subscription: 'free',
        role: 'jobseeker',
        created_at: new Date().toISOString(),
        profile_views: 0,
        engagement: 0,
        connections_received: 0
      });
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ ...userWithoutPassword, id: stringId(user.id) });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  apiRouter.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    const [user] = await db.query('SELECT id FROM users WHERE email = $email', { email }) as any;
    if (!user?.[0]) {
      return res.status(404).json({ error: 'No user found with this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    await db.query('DELETE FROM otps WHERE email = $email', { email });
    await db.query('CREATE otps CONTENT $data', { data: { email, otp, expires_at: expiresAt } });

    console.log(`[AUTH] OTP for ${email}: ${otp}`);
    
    // In demo environment, we return it to help the user. In production, we'd email it.
    res.json({ success: true, message: 'OTP sent to your email', debug_otp: otp });
  });

  apiRouter.post('/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const [records] = await db.query('SELECT * FROM otps WHERE email = $email AND otp = $otp', { email, otp }) as any;
    const record = records?.[0];

    if (!record) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(401).json({ error: 'OTP expired' });
    }

    res.json({ success: true });
  });

  apiRouter.post('/auth/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    
    const [records] = await db.query('SELECT * FROM otps WHERE email = $email AND otp = $otp', { email, otp }) as any;
    const record = records?.[0];
    if (!record || new Date(record.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);

    await db.query('UPDATE users SET password = $hash WHERE email = $email', { hash, email });
    await db.query('DELETE FROM otps WHERE email = $email', { email });

    res.json({ success: true, message: 'Password reset successfully' });
  });

  // Notifications
  apiRouter.get('/notifications/:userId', async (req, res) => {
    const { userId } = req.params;
    const idRecord = userId.includes(':') ? userId : `users:${userId}`;
    try {
      const [notifications] = await db.query('SELECT * FROM notifications WHERE user_id = type::record($userId) ORDER BY created_at DESC LIMIT 20', { userId: idRecord }) as any;
      res.json((notifications || []).map((n: any) => ({ ...n, id: stringId(n.id), user_id: stringId(n.user_id) })));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/notifications/read', async (req, res) => {
    const { notificationId } = req.body;
    await db.query('UPDATE type::record($id) MERGE $data', { id: notificationId, data: { is_read: 1 } });
    res.json({ success: true });
  });

  // Connections
  apiRouter.get('/connections/status/:userId/:targetId', async (req, res) => {
    try {
      const { userId, targetId } = req.params;
      const uId = userId.includes(':') ? userId : `users:${userId}`;
      const tId = targetId.includes(':') ? targetId : `users:${targetId}`;
      const [connection] = await db.query('SELECT id FROM connections WHERE user_id = type::record($uId) AND target_id = type::record($tId)', { uId, tId }) as any;
      res.json({ connected: !!(connection?.[0]) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/connections', async (req, res) => {
    const { user_id, target_id } = req.body;
    
    const [existing] = await db.query('SELECT id FROM connections WHERE user_id = $userId AND target_id = $targetId', { userId: user_id, targetId: target_id }) as any;
    if (existing?.[0]) {
      return res.json({ success: true, message: 'Already connected' });
    }

    await adapter.insert('connections', {
      user_id: toRecordId(user_id), 
      target_id: toRecordId(target_id), 
      status: 'accepted', 
      created_at: new Date().toISOString() 
    });

    // Increment connections_received for the target
    await adapter.increment('users', target_id, 'connections_received', 1);
    
    // Notification for the target
    const [users] = await db.query('SELECT * FROM type::record($userId)', { userId: user_id }) as any;
    const user = users?.[0];
    await db.query('CREATE notifications CONTENT $data', {
      data: {
        user_id: toRecordId(target_id),
        type: 'connection',
        title: 'New Connection',
        content: `${user?.full_name || 'Someone'} is now connected with you.`,
        created_at: new Date().toISOString()
      }
    });
      
    res.json({ success: true });
  });

  apiRouter.delete('/connections/:userId/:targetId', async (req, res) => {
    try {
      const { userId, targetId } = req.params;
      const uId = userId.includes(':') ? userId : `users:${userId}`;
      const tId = targetId.includes(':') ? targetId : `users:${targetId}`;
      await db.query('DELETE FROM connections WHERE user_id = type::record($uId) AND target_id = type::record($tId)', { uId: uId, tId: tId });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Jobs
  apiRouter.get('/topics', async (req, res) => {
    try {
      const [posts] = await db.query('SELECT content FROM posts WHERE content CONTAINS "#" LIMIT 100') as any;
      const hashtags: Record<string, number> = {};
      posts?.forEach((p: any) => {
        const matches = p.content.match(/#[a-z0-9_]+/gi);
        matches?.forEach((tag: string) => {
          hashtags[tag] = (hashtags[tag] || 0) + 1;
        });
      });
      const sorted = Object.entries(hashtags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(e => e[0]);
      
      // Fallback if no hashtags found in DB
      const result = sorted.length > 0 ? sorted : ["#FutureOman", "#TechSynapse", "#OmanVision2040", "#CareerScale", "#IndustrialOps"];
      res.json(result);
    } catch (err) {
      res.json(["#FutureOman", "#TechSynapse", "#OmanVision2040", "#CareerScale", "#IndustrialOps"]);
    }
  });

  apiRouter.get('/jobs', async (req, res) => {
    const { q, experience, minSalary, placeId } = req.query;
    try {
      let query = 'SELECT *, place_id.name as place_name FROM jobs WHERE 1=1';
      const params: any = {};
      if (q) {
        query += ' AND (title ~ $q OR description ~ $q OR company_name ~ $q)';
        params.q = q;
      }
      if (placeId && placeId !== 'all') {
        const pId = (placeId as string).includes(':') ? placeId : `places:${placeId}`;
        query += ' AND place_id = type::record($placeId)';
        params.placeId = pId;
      }
      if (experience && experience !== 'all') {
        query += ' AND experience_level = $experience';
        params.experience = experience;
      }
      query += ' ORDER BY created_at DESC';
      const [jobs] = await db.query(query, params) as any;
      res.json((jobs || []).map((j: any) => ({ ...j, id: stringId(j.id), user_id: stringId(j.user_id), place_id: stringId(j.place_id) })));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/jobs', async (req, res) => {
    const { user_id, title, company_name, location, description, salary_range, experience_level, end_date } = req.body;
    const [users] = await db.query('SELECT * FROM type::record($userId)', { userId: user_id }) as any;
    const user = users?.[0];
    if (!user || (user.is_company_rep !== 1 && user.role !== 'company')) {
      return res.status(403).json({ error: 'Only verified company representatives or company accounts can post jobs' });
    }
    const [jobs] = await db.query('CREATE jobs CONTENT $data', {
      data: {
        user_id: toRecordId(user_id), 
        title, 
        company_name, 
        location, 
        description, 
        salary_range, 
        experience_level, 
        end_date,
        created_at: new Date().toISOString()
      }
    }) as any;
    const job = jobs?.[0];
    
    await db.query('CREATE posts CONTENT $data', {
      data: {
        user_id: toRecordId(user_id), 
        content: `We are hiring for: ${title} at ${company_name}. Location: ${location}.`, 
        type: 'standard', 
        attachment_type: 'job', 
        attachment_id: toRecordId(job.id),
        created_at: new Date().toISOString()
      }
    });
    res.json({ success: true, id: job.id });
  });

  apiRouter.get('/jobs/:jobId/applicants', async (req, res) => {
    const [applicants] = await db.query('SELECT *, user_id.* as user FROM job_applications WHERE job_id = type::record($jobId) ORDER BY created_at DESC', { jobId: req.params.jobId }) as any;
    const flattened = applicants?.map((ap: any) => ({ 
      ...ap, 
      id: stringId(ap.id),
      user_id: stringId(ap.user_id),
      job_id: stringId(ap.job_id),
      ...ap.user,
      user: ap.user ? { ...ap.user, id: stringId(ap.user.id) } : undefined
    })) || [];
    res.json(flattened);
  });

  apiRouter.post('/jobs/applications/status', async (req, res) => {
    await db.query('UPDATE type::record($id) MERGE $data', { id: req.body.applicationId, data: { status: req.body.status } });
    res.json({ success: true });
  });

  // Search
  apiRouter.get('/search', async (req, res) => {
    const term = req.query.q as string;
    const type = req.query.type;
    const results: any = { posts: [], jobs: [], users: [] };
    
    if (!type || type === 'posts' || type === 'all') {
      const posts = await adapter.search<any>('posts', term, ['content', 'keywords']);
      // We need to fetch user details for each post
      results.posts = await Promise.all((posts || []).map(async (p: any) => {
        const user = await adapter.get<any>('users', stringId(p.user_id));
        return {
          ...p,
          id: stringId(p.id),
          user_id: stringId(p.user_id),
          user: user ? { ...user, id: stringId(user.id) } : undefined
        };
      }));
    }
    if (!type || type === 'jobs' || type === 'all') {
      results.jobs = await adapter.search<any>('jobs', term, ['title', 'company_name', 'description', 'keywords']);
      results.jobs = results.jobs.map((j: any) => ({ ...j, id: stringId(j.id), user_id: stringId(j.user_id) }));
    }
    if (!type || type === 'users' || type === 'all' || type === 'companies') {
       let users = await adapter.search<any>('users', term, ['full_name', 'headline', 'cv_text']);
       if (type === 'companies') {
         users = users.filter(u => u.role === 'company');
       }
       results.users = (users || []).map((u: any) => ({ ...u, id: stringId(u.id) }));
    }
    res.json(results);
  });

  apiRouter.post('/jobs/apply', async (req, res) => {
    const { user_id, job_id, attachment_type, attachment_id } = req.body;
    const [existing] = await db.query('SELECT id FROM job_applications WHERE user_id = $userId AND job_id = $jobId', { userId: user_id, jobId: job_id }) as any;
    if (existing?.[0]) return res.json({ success: true, message: 'Already applied' });
    await db.query('CREATE job_applications CONTENT $data', {
      data: {
        user_id: toRecordId(user_id), 
        job_id: toRecordId(job_id), 
        attachment_type: attachment_type || 'none', 
        attachment_id: toRecordId(attachment_id) || null, 
        status: 'pending',
        created_at: new Date().toISOString()
      }
    });
    res.json({ success: true });
  });

  // Job Alerts
  apiRouter.get('/job-alerts/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const idRecord = userId.includes(':') ? userId : `users:${userId}`;
      const [alerts] = await db.query('SELECT * FROM job_alerts WHERE user_id = type::record($userId)', { userId: idRecord }) as any;
      res.json(alerts || []);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/job-alerts', async (req, res) => {
    const { user_id, ...rest } = req.body;
    await db.query('CREATE job_alerts CONTENT $data', { 
      data: { 
        ...rest, 
        user_id: toRecordId(user_id), 
        created_at: new Date().toISOString() 
      } 
    });
    res.json({ success: true });
  });

  apiRouter.delete('/job-alerts/:alertId', async (req, res) => {
    await db.query('DELETE type::record($id)', { id: req.params.alertId });
    res.json({ success: true });
  });

  // Messages
  apiRouter.get('/messages/conversations/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      // Find all unique participants the user has messaged or received messages from
      const [messages] = await db.query(`
        SELECT sender_id, receiver_id FROM messages 
        WHERE sender_id = type::record($userId) OR receiver_id = type::record($userId)
      `, { userId: userId.includes(':') ? userId : `users:${userId}` }) as any;
      
      if (!messages) return res.json([]);
      
      const otherParticipantIds = new Set<string>();
      messages.forEach((p: any) => {
        const sId = String(p.sender_id);
        const rId = String(p.receiver_id);
        const currentUserId = userId.includes(':') ? userId : `users:${userId}`;
        if (sId !== currentUserId) otherParticipantIds.add(sId);
        if (rId !== currentUserId) otherParticipantIds.add(rId);
      });

      const conversations = [];
      for (const otherId of Array.from(otherParticipantIds)) {
        const [users] = await db.query('SELECT * FROM type::record($id)', { id: otherId }) as any;
        const user = users?.[0];
        if (!user) continue;

        const [lastMsgs] = await db.query('SELECT content, created_at FROM messages WHERE (sender_id = type::record($userId) AND receiver_id = type::record($otherId)) OR (sender_id = type::record($otherId) AND receiver_id = type::record($userId)) ORDER BY created_at DESC LIMIT 1', { 
          userId: userId.includes(':') ? userId : `users:${userId}`, 
          otherId 
        }) as any;
        const lastMsg = lastMsgs?.[0];

        const [unreadRecords] = await db.query('SELECT count() FROM messages WHERE sender_id = type::record($otherId) AND receiver_id = type::record($userId) AND is_read = 0 GROUP ALL', { 
          userId: userId.includes(':') ? userId : `users:${userId}`, 
          otherId 
        }) as any;

        conversations.push({
          id: stringId(user.id),
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          headline: user.headline,
          last_message: lastMsg?.content,
          last_message_time: lastMsg?.created_at,
          unread_count: (unreadRecords as any)?.[0]?.count || 0
        });
      }
      
      const sorted = conversations.sort((a, b) => {
        const dateA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
        const dateB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
        return dateB - dateA;
      });

      res.json(sorted);
    } catch (err) {
      console.error('Conversations error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.get('/messages/:userId/:targetId', async (req, res) => {
    try {
      const { userId, targetId } = req.params;
      const uId = userId.includes(':') ? userId : `users:${userId}`;
      const tId = targetId.includes(':') ? targetId : `users:${targetId}`;
      await db.query('UPDATE messages SET is_read = 1 WHERE sender_id = type::record($tId) AND receiver_id = type::record($uId)', { uId, tId });
      const [messages] = await db.query('SELECT * FROM messages WHERE (sender_id = type::record($uId) AND receiver_id = type::record($tId)) OR (sender_id = type::record($tId) AND receiver_id = type::record($uId)) ORDER BY created_at ASC', { uId, tId }) as any;
      res.json((messages || []).map((m: any) => ({
        ...m,
        id: stringId(m.id),
        sender_id: stringId(m.sender_id),
        receiver_id: stringId(m.receiver_id)
      })));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/messages', async (req, res) => {
    const { sender_id, receiver_id, ...rest } = req.body;
    const [msgs] = await db.query('CREATE messages CONTENT $data', { 
      data: { 
        ...rest, 
        sender_id: toRecordId(sender_id),
        receiver_id: toRecordId(receiver_id),
        is_read: 0, 
        created_at: new Date().toISOString() 
      } 
    }) as any;
    const msg = msgs?.[0];
    res.json({ success: true, id: stringId(msg?.id) });
  });

  // Posts Feed
  apiRouter.get('/content', async (req, res) => {
    const { type, userId, keyword } = req.query;
    let query = `
      SELECT *, 
      user_id.* as user,
      (SELECT count() FROM comments WHERE post_id = $parent.id GROUP ALL)[0].count as comment_count,
      (SELECT count(), response_index FROM post_responses WHERE post_id = $parent.id GROUP BY response_index) as stats
      FROM posts
    `;
    const params: any = {};
    const conditions: string[] = [];
    
    if (type) { conditions.push('type = $type'); params.type = type; }
    if (userId) { conditions.push('user_id = type::record($userId)'); params.userId = userId; }
    if (keyword) {
      conditions.push('content ~ $keyword');
      params.keyword = keyword;
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    
    try {
      const resultsFromDB = await adapter.query<any[]>(query, params);
      const posts = (resultsFromDB as any)?.[0] || [];
      const results = (posts || []).map((p: any) => {
        const { id: postId, user_id: postUserId, user: postUser, stats: postStats, ...restPost } = p;
        
        // Format stats back to string if needed by frontend (or we can update frontend)
        // Current frontend expects "0:5,1:10"
        const formattedStats = (postStats || []).map((s: any) => `${s.response_index}:${s.count}`).join(',');

        return { 
          ...restPost,
          id: stringId(postId),
          user_id: stringId(postUserId),
          user: postUser ? { ...postUser, id: stringId(postUser.id) } : undefined,
          comment_count: p.comment_count || 0,
          response_stats: formattedStats
        };
      });
      res.json(results);
    } catch (err) {
      console.error('Content fetch error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.get('/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    const { viewerId } = req.query;
    
    const idRecord = userId.includes(':') ? userId : `users:${userId}`;
    
    try {
      if (viewerId && viewerId !== userId) {
        await db.query('UPDATE type::record($id) SET profile_views = (profile_views || 0) + 1, engagement = (engagement || 0) + 1', { id: idRecord });
      }
      
      const [users] = await db.query('SELECT * FROM type::record($id)', { id: idRecord }) as any;
      const user = users?.[0];
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const [cv] = await db.query('SELECT * FROM cv_sections WHERE user_id = type::record($userId) ORDER BY start_date DESC', { userId: idRecord }) as any;
      const [skills] = await db.query('SELECT * FROM user_skills WHERE user_id = type::record($userId)', { userId: idRecord }) as any;
      const [portfolio] = await db.query('SELECT * FROM portfolio WHERE user_id = type::record($userId)', { userId: idRecord }) as any;
      const [jobs] = (user.is_company_rep || user.role === 'company' ? await db.query('SELECT * FROM jobs WHERE user_id = type::record($userId) ORDER BY created_at DESC', { userId: idRecord }) : [[]]) as any[];
      
      const result = { 
        ...user,
        id: stringId(user.id),
        analytics: {
          profile_views: user.profile_views || 0,
          connections_received: user.connections_received || 0,
          engagement: user.engagement || 0
        },
        cv: (cv || []).map((c: any) => ({ ...c, id: stringId(c.id) })), 
        skills: (skills || []).map((s: any) => ({ ...s, id: stringId(s.id) })), 
        portfolio: (portfolio || []).map((p: any) => ({ ...p, id: stringId(p.id) })), 
        jobs: (jobs || []).map((j: any) => ({ ...j, id: stringId(j.id) })) 
      };
      
      res.json(result);
    } catch (err) {
      console.error(`Profile fetch error:`, err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/cv', async (req, res) => {
    const { user_id, ...rest } = req.body;
    try {
      const section = await adapter.insert<any>('cv_sections', {
        ...rest,
        user_id: toRecordId(user_id, 'users'),
        created_at: new Date().toISOString()
      });
      
      await adapter.insert('posts', {
        user_id: toRecordId(user_id, 'users'),
        content: `Updated CV: Added ${req.body.type} - ${req.body.title} at ${req.body.subtitle}`,
        type: 'cv_update',
        attachment_type: 'cv_item',
        attachment_id: section.id,
        created_at: new Date().toISOString()
      });
      res.json({ success: true, id: stringId(section.id) });
    } catch (err) {
      console.error('CV update error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.put('/profile', async (req, res) => {
    const { user_id, headline, bio, avatar_url, company_name, company_description, company_website } = req.body;
    const idRecord = user_id.includes(':') ? user_id : `users:${user_id}`;
    try {
      await db.query('UPDATE type::record($id) MERGE $data', { id: idRecord, data: { headline, bio, avatar_url, company_name, company_description, company_website } });
      res.json({ success: true });
    } catch (err) {
      console.error(`Profile update failure for ${user_id}:`, err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/skills', async (req, res) => {
    const { user_id, name, proficiency, verification_url } = req.body;
    const [userSkill] = await db.query('SELECT id FROM user_skills WHERE user_id = type::record($user_id) AND name = $name', { user_id, name }) as any;
    if (userSkill?.[0]) {
      await db.query('UPDATE type::record($id) MERGE $data', { id: userSkill[0].id, data: { proficiency, verification_url, is_verified: verification_url ? 1 : 0 } });
    } else {
      await db.query('CREATE user_skills CONTENT $data', { 
        data: { 
          user_id: toRecordId(user_id), 
          name, 
          proficiency, 
          verification_url, 
          is_verified: verification_url ? 1 : 0 
        } 
      });
    }
    res.json({ success: true });
  });

  apiRouter.post('/skills/verify', async (req, res) => {
    const { user_id, name, verification_url } = req.body;
    const [userSkill] = await db.query('SELECT id FROM user_skills WHERE user_id = $user_id AND name = $name', { user_id, name }) as any;
    if (userSkill?.[0]) {
      await db.query('UPDATE type::record($id) MERGE $data', { id: userSkill[0].id, data: { verification_url, is_verified: 1 } });
    } else {
      await db.query('CREATE user_skills CONTENT $data', { data: { user_id, name, verification_url, is_verified: 1 } });
    }
    res.json({ success: true });
  });

  apiRouter.post('/posts', async (req, res) => {
    const { user_id, ...rest } = req.body;
    console.log(`[DB] Creating post for user: ${user_id}`, rest);
    try {
      const post = await adapter.insert<any>('posts', {
        ...rest,
        user_id: toRecordId(user_id),
        created_at: new Date().toISOString()
      });
      console.log(`[DB] Post created successfully:`, post.id);
      res.json({ success: true, id: stringId(post?.id), post });
    } catch (err) {
      console.error('Post creation error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/posts/:postId/respond', async (req, res) => {
    const { postId } = req.params;
    const { user_id, type, response_index } = req.body;
    try {
      const existing = await adapter.list('post_responses', {
        filter: 'post_id = type::record($postId) AND user_id = type::record($userId)',
        params: { postId, userId: user_id }
      });

      if (existing.length > 0) {
        await adapter.update('post_responses', stringId((existing[0] as any).id), { response_index });
      } else {
        await adapter.insert('post_responses', {
          post_id: toRecordId(postId, 'posts'),
          user_id: toRecordId(user_id, 'users'),
          type,
          response_index,
          created_at: new Date().toISOString()
        });
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Post response error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.get('/posts/:postId/comments', async (req, res) => {
    try {
      const [results] = await db.query('SELECT *, user_id.* as user FROM comments WHERE post_id = $postId ORDER BY created_at ASC', { postId: req.params.postId }) as any;
      
      const mapped = (results || []).map((c: any) => ({
        ...c,
        id: stringId(c.id),
        user_id: stringId(c.user?.id || c.user_id),
        full_name: c.user?.full_name,
        avatar_url: c.user?.avatar_url
      }));
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/comments', async (req, res) => {
    const { user_id, post_id, ...rest } = req.body;
    try {
      await adapter.insert('comments', {
        ...rest,
        user_id: toRecordId(user_id, 'users'),
        post_id: toRecordId(post_id, 'posts'),
        created_at: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err) {
      console.error('Comment creation error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.get('/candidates', async (req, res) => {
    const { skills } = req.query;
    try {
      let query = 'SELECT *, (SELECT VALUE name FROM user_skills WHERE user_id = $parent.id) as skill_list FROM users WHERE role = "jobseeker"';
      const params: any = {};
      if (skills) {
        query += ' AND (SELECT count() FROM user_skills WHERE user_id = $parent.id AND name IN $skillArr)[0].count > 0';
        params.skillArr = (skills as string).split(',').map(s => s.trim());
      }
      const resultsFromDB = await adapter.query<any[]>(query, params);
      const users = (resultsFromDB as any)?.[0] || [];
      const results = users.map((u: any) => ({ ...u, id: stringId(u.id) }));
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.get('/recommendations/:userId?', async (req, res) => {
    const { userId } = req.params;
    try {
      const idRecord = userId && userId !== 'undefined' ? (userId.includes(':') ? userId : `users:${userId}`) : null;
      let query = 'SELECT id, full_name, headline, avatar_url, role FROM users WHERE role != "admin"';
      const params: any = {};
      if (idRecord) {
        query += ' AND id != type::record($userId)';
        params.userId = idRecord;
      }
      query += ' LIMIT 6';
      const [recs] = await db.query(query, params) as any;
      res.json((recs || []).map((r: any) => ({ ...r, id: stringId(r.id) })));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.get('/files/:userId', async (req, res) => {
    const { userId } = req.params;
    const { purpose } = req.query;
    const idRecord = userId.includes(':') ? userId : `users:${userId}`;
    try {
      let query = 'SELECT * FROM files WHERE user_id = type::record($userId)';
      const params: any = { userId: idRecord };
      if (purpose) { query += ' AND purpose = $purpose'; params.purpose = purpose; }
      query += ' ORDER BY created_at DESC';
      const [files] = await db.query(query, params) as any;
      res.json(files || []);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/files', async (req, res) => {
    const { user_id, ...rest } = req.body;
    const [files] = await db.query('CREATE files CONTENT $data', { 
      data: { 
        ...rest, 
        user_id: toRecordId(user_id), 
        created_at: new Date().toISOString() 
      } 
    }) as any;
    const file = files?.[0];
    res.json({ success: true, id: stringId(file?.id) });
  });

  apiRouter.delete('/files/:fileId', async (req, res) => {
    await db.query('DELETE type::record($id)', { id: req.params.fileId });
    res.json({ success: true });
  });

  // AI logic has been moved to frontend.
  apiRouter.post('/user/preference/place', async (req, res) => {
    const { user_id, place_id } = req.body;
    await db.query('UPDATE type::record($userId) MERGE $data', { userId: user_id, data: { place_id: place_id === "all" ? null : place_id } });
    res.json({ success: true });
  });

  // Mount API Router
  apiRouter.delete('/posts/:postId', async (req, res) => {
    const { postId } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) return res.status(401).json({ error: 'Auth required' });
    
    try {
      const [post] = await db.query('SELECT user_id FROM type::record($id)', { id: postId.includes(':') ? postId : `posts:${postId}` }) as any;
      if (!post?.[0]) return res.status(404).json({ error: 'Post not found' });
      
      const [admin] = await db.query('SELECT role FROM type::record($id)', { id: userId.toString().includes(':') ? userId : `users:${userId}` }) as any;
      const isAdmin = admin?.[0]?.role === 'admin';
      
      if (stringId(post[0].user_id) !== stringId(userId) && !isAdmin) {
        return res.status(403).json({ error: 'Unauthorized to delete this post' });
      }
      
      await db.query('DELETE type::record($id)', { id: postId.includes(':') ? postId : `posts:${postId}` });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.put('/posts/:postId', async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.headers['x-user-id'];
    
    if (!userId) return res.status(401).json({ error: 'Auth required' });
    
    try {
      const [post] = await db.query('SELECT user_id FROM type::record($id)', { id: postId.includes(':') ? postId : `posts:${postId}` }) as any;
      if (!post?.[0]) return res.status(404).json({ error: 'Post not found' });
      
      if (stringId(post[0].user_id) !== stringId(userId)) {
        return res.status(403).json({ error: 'Unauthorized to edit this post' });
      }
      
      await db.query('UPDATE type::record($id) SET content = $content', { 
        id: postId.includes(':') ? postId : `posts:${postId}`,
        content 
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  apiRouter.post('/admin/seed-jobs', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Auth required' });
    
    try {
      const [user] = await db.query('SELECT role FROM type::record($id)', { id: userId.toString().includes(':') ? userId : `users:${userId}` }) as any;
      if (user?.[0]?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

      // Find some companies to assign jobs to
      const [companies] = await db.query('SELECT id, company_name FROM users WHERE role = "company" LIMIT 5') as any;
      
      if (!companies || companies.length === 0) {
        return res.status(400).json({ error: 'No company accounts found to assign jobs to. Create some company accounts first.' });
      }

      const seedJobs = [
        { title: 'Senior Software Engineer', location: 'Muscat, Oman', salary: '$5,000 - $8,000', experience: '5+ years' },
        { title: 'Project Manager', location: 'Salalah, Oman', salary: '$4,000 - $6,000', experience: '3+ years' },
        { title: 'Marketing Specialist', location: 'Dubai, UAE', salary: '$3,500 - $5,000', experience: '2+ years' },
        { title: 'UX/UI Designer', location: 'Remote', salary: '$4,500 - $7,000', experience: '4+ years' },
        { title: 'Data Scientist', location: 'Muscat, Oman', salary: '$6,000 - $9,000', experience: '3+ years' },
      ];

      for (const job of seedJobs) {
        const company = companies[Math.floor(Math.random() * companies.length)];
        await db.query('CREATE jobs SET user_id = $userId, title = $title, company_name = $company, location = $location, description = "Join our team in this exciting role!", salary_range = $salary, experience_level = $exp, end_date = time::now() + 30d, created_at = time::now()', {
          userId: company.id,
          title: job.title,
          company: company.company_name || 'Innovate Oman',
          location: job.location,
          salary: job.salary,
          exp: job.experience
        });
      }

      res.json({ success: true, count: seedJobs.length });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.use('/api', apiRouter);

  // API 404 & Error Handling
  apiRouter.use((req, res) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.url}` });
  });

  apiRouter.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Server Error' });
  });

  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.url}` });
  });

  // Vite
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', async () => {
      console.log(`Server on port ${PORT}`);
      try {
        await initSurreal();
        await setupDatabase();
      } catch (dbErr) {
        console.error('Database initialization/setup failed:', dbErr);
      }
    });
  }

  export default app;
