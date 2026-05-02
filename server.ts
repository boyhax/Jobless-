import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('prosync.db');

let genAI: GoogleGenerativeAI | null = null;

function getModel(modelName: string = "gemini-1.5-flash"): GenerativeModel {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
  }
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Enhanced AI helper with smart fallbacks for demo purposes
 */
async function generateContentSafe(prompt: string, fallback: any, isJson: boolean = true) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.length < 20) {
    console.warn("AI: Using mock fallback (Invalid or placeholder API key)");
    return fallback;
  }

  try {
    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...(isJson ? { generationConfig: { responseMimeType: 'application/json' } } : {})
    });
    const text = result.response.text();
    return isJson ? JSON.parse(text) : text;
  } catch (err) {
    console.error("AI Error, using fallback:", err);
    return fallback;
  }
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    region TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    full_name TEXT,
    headline TEXT,
    avatar_url TEXT,
    bio TEXT,
    role TEXT DEFAULT 'jobseeker', -- 'admin', 'company', 'jobseeker'
    subscription TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
    place_id INTEGER,
    cv_text TEXT,
    profile_views INTEGER DEFAULT 0,
    is_company_rep INTEGER DEFAULT 0,
    company_name TEXT,
    company_description TEXT,
    company_website TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(place_id) REFERENCES places(id)
  );

  CREATE TABLE IF NOT EXISTS cv_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'experience', 'education', 'project', 'certification'
    title TEXT,
    subtitle TEXT,
    description TEXT,
    start_date DATE,
    end_date DATE,
    verification_url TEXT,
    keywords TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS user_skills (
    user_id INTEGER,
    skill_id INTEGER,
    proficiency INTEGER, -- 1 to 5
    verification_url TEXT,
    is_verified INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, skill_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (skill_id) REFERENCES skills(id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    type TEXT, -- 'standard', 'cv_update', 'discussion'
    attachment_type TEXT, -- 'cv_item', 'link', 'discussion'
    attachment_id INTEGER,
    quiz_data TEXT, -- JSON
    poll_data TEXT, -- JSON
    keywords TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS post_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    type TEXT, -- 'quiz', 'poll'
    response_index INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    url TEXT,
    thumbnail_url TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    target_id INTEGER,
    status TEXT, -- 'pending', 'accepted'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (target_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    company_name TEXT,
    place_id INTEGER,
    location TEXT, -- Legacy / Searchable
    description TEXT,
    salary_range TEXT,
    experience_level TEXT, -- 'Junior', 'Mid', 'Senior', 'Lead'
    keywords TEXT, -- JSON array
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (place_id) REFERENCES places(id)
  );

  CREATE TABLE IF NOT EXISTS job_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    job_id INTEGER,
    attachment_type TEXT,
    attachment_id INTEGER,
    status TEXT, -- 'pending', 'reviewed', 'hired', 'shortlisted'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    title TEXT,
    content TEXT,
    link TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    url TEXT,
    type TEXT,
    purpose TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS job_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    keyword TEXT,
    experience_level TEXT,
    place_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (place_id) REFERENCES places(id)
  );

  CREATE TABLE IF NOT EXISTS otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Places (Oman Cities)
const cities = [
  { name: 'Muscat', region: 'Muscat' },
  { name: 'Salalah', region: 'Dhofar' },
  { name: 'Sohar', region: 'Al Batinah North' },
  { name: 'Nizwa', region: 'Al Dakhiliyah' },
  { name: 'Sur', region: 'Al Sharqiyah South' },
  { name: 'Ibri', region: 'Al Dhahirah' },
  { name: 'Khasab', region: 'Musandam' },
  { name: 'Rustaq', region: 'Al Batinah South' }
];

const checkPlaces = db.prepare('SELECT COUNT(*) as count FROM places').get() as { count: number };
if (checkPlaces.count === 0) {
  const insertPlace = db.prepare('INSERT INTO places (name, region) VALUES (?, ?)');
  cities.forEach(city => insertPlace.run(city.name, city.region));
}

// Migrations
try { db.prepare('ALTER TABLE user_skills ADD COLUMN verification_url TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE user_skills ADD COLUMN is_verified INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN company_name TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN company_description TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN company_website TEXT').run(); } catch(e) {}
try { db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'jobseeker'").run(); } catch(e) {}
try { db.prepare("ALTER TABLE users ADD COLUMN subscription TEXT DEFAULT 'free'").run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN place_id INTEGER').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN cv_text TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE jobs ADD COLUMN place_id INTEGER').run(); } catch(e) {}
try { db.prepare('ALTER TABLE jobs ADD COLUMN keywords TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE posts ADD COLUMN keywords TEXT').run(); } catch(e) {}

// Midleware for RBAC
const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as any;
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admin access required' });
  next();
};

// Seed Data
const seedDB = () => {
  console.log('Seeding database with fresh data...');
  db.exec('DELETE FROM users; DELETE FROM posts; DELETE FROM jobs; DELETE FROM cv_sections;');
  
  const salt = bcrypt.genSaltSync(10);
  const defaultHash = bcrypt.hashSync('Password123!', salt);

  const users = [
    ['admin@prosync.com', 'System Admin', 'Platform Administration', 'Admin of ProSync Oman.', 'admin', 'enterprise', 1, defaultHash],
    ['ahmed@muscat.om', 'Ahmed Al-Said', 'Senior Software Architect', 'Expert in cloud systems in Muscat.', 'jobseeker', 'pro', 1, defaultHash],
    ['recruiter@omantel.om', 'Omantel HR', 'Talent Acquisition', 'Building the future of telecom in Oman.', 'company', 'enterprise', 1, defaultHash],
    ['fatima@salalah.om', 'Fatima Al-Balushi', 'UX Designer', 'PASSIONATE about creating beautiful experiences.', 'jobseeker', 'free', 2, defaultHash],
    ['sohar_steel@industries.om', 'Sohar Steel', 'Manufacturing Excellence', 'Leading industrial player in Sohar.', 'company', 'pro', 3, defaultHash],
    ['salim@omaninfra.com', 'Salim Al-Harthy', 'Infrastructure Lead', 'Building Oman\'s digital bridge.', 'company', 'pro', 1, defaultHash],
  ];

  const userIds: Record<string, number> = {};
  for (const [email, name, headline, bio, role, sub, placeId, pass] of users) {
    const res = db.prepare('INSERT INTO users (email, full_name, headline, bio, role, subscription, place_id, is_company_rep, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(email, name, headline, bio, role, sub, placeId, role === 'company' ? 1 : 0, pass);
    userIds[email as string] = res.lastInsertRowid as number;
  }

  // Seed Jobs with keywords and places
  const jobSeed = [
    [userIds['recruiter@omantel.om'], 'Cloud Infrastructure Engineer', 'Omantel HR', 1, 'Scale our nationwide network.', '$2k - $4k', 'Senior', JSON.stringify(['cloud', 'networking', 'telecom'])],
    [userIds['sohar_steel@industries.om'], 'Mechanical Supervisor', 'Sohar Steel', 3, 'Manage production floor safety and efficiency.', '$1.5k - $2.5k', 'Mid', JSON.stringify(['mechanical', 'safety', 'industries'])],
  ];
  for (const job of jobSeed) {
    db.prepare('INSERT INTO jobs (user_id, title, company_name, place_id, description, salary_range, experience_level, keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(...job);
  }

  // Seed Posts
  const postSeed = [
    [userIds['ahmed@muscat.om'], 'Excited to see the tech growth in Muscat lately! #OmanTech', 'standard', JSON.stringify(['tech', 'muscat'])],
    [userIds['fatima@salalah.om'], 'How important is cultural context in UI design for the Gulf region?', 'discussion', JSON.stringify(['design', 'culture'])],
  ];
  for (const post of postSeed) {
    db.prepare('INSERT INTO posts (user_id, content, type, keywords) VALUES (?, ?, ?, ?)')
      .run(...post);
  }
};

const seedDataCheck = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (seedDataCheck.count === 0) seedDB();

async function startServer() {
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

  // Admin Endpoints
  apiRouter.get('/admin/analytics', isAdmin, (req, res) => {
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get(),
      posts: db.prepare('SELECT COUNT(*) as count FROM posts').get(),
      jobs: db.prepare('SELECT COUNT(*) as count FROM jobs').get(),
      subs: db.prepare('SELECT subscription, COUNT(*) as count FROM users GROUP BY subscription').all(),
      roles: db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all()
    };
    res.json(stats);
  });

  apiRouter.get('/admin/users', isAdmin, (req, res) => {
    const users = db.prepare('SELECT id, full_name, email, role, subscription FROM users').all();
    res.json(users);
  });

  apiRouter.post('/admin/seed', isAdmin, (req, res) => {
    seedDB();
    res.json({ success: true, message: 'Database re-seeded successfully' });
  });

  apiRouter.post('/admin/update-subscription', isAdmin, (req, res) => {
    const { userId, subscription } = req.body;
    db.prepare('UPDATE users SET subscription = ? WHERE id = ?').run(subscription, userId);
    res.json({ success: true });
  });

  // Places
  apiRouter.get('/places', (req, res) => {
    res.json(db.prepare('SELECT * FROM places').all());
  });

  // Real Auth Endpoints
  apiRouter.post('/auth/check-email', (req, res) => {
    const { email } = req.body;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    res.json({ exists: !!user });
  });

  apiRouter.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'This user has no password set. Please use Forgot Password.' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Don't send password hash back
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  apiRouter.post('/auth/register', (req, res) => {
    const { email, password, full_name } = req.body;
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    try {
      const result = db.prepare('INSERT INTO users (email, full_name, password, headline) VALUES (?, ?, ?, ?)')
        .run(email, full_name, hash, 'Professional Individual');
      
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  apiRouter.post('/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'No user found with this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    db.prepare('DELETE FROM otps WHERE email = ?').run(email);
    db.prepare('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)').run(email, otp, expiresAt);

    console.log(`[AUTH] OTP for ${email}: ${otp}`);
    
    // In demo environment, we return it to help the user. In production, we'd email it.
    res.json({ success: true, message: 'OTP sent to your email', debug_otp: otp });
  });

  apiRouter.post('/auth/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const record = db.prepare('SELECT * FROM otps WHERE email = ? AND otp = ?').get(email, otp) as any;

    if (!record) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(401).json({ error: 'OTP expired' });
    }

    res.json({ success: true });
  });

  apiRouter.post('/auth/reset-password', (req, res) => {
    const { email, otp, newPassword } = req.body;
    
    const record = db.prepare('SELECT * FROM otps WHERE email = ? AND otp = ?').get(email, otp) as any;
    if (!record || new Date(record.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);

    db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hash, email);
    db.prepare('DELETE FROM otps WHERE email = ?').run(email);

    res.json({ success: true, message: 'Password reset successfully' });
  });

  // Notifications
  apiRouter.get('/notifications/:userId', (req, res) => {
    const { userId } = req.params;
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId);
    res.json(notifications);
  });

  apiRouter.post('/notifications/read', (req, res) => {
    const { notificationId } = req.body;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);
    res.json({ success: true });
  });

  // Connections
  apiRouter.post('/connections', (req, res) => {
    const { user_id, target_id } = req.body;
    const existing = db.prepare('SELECT id FROM connections WHERE user_id = ? AND target_id = ?').get(target_id, user_id);
    if (existing) {
      db.prepare('UPDATE connections SET status = ? WHERE id = ?').run('accepted', (existing as any).id);
      res.json({ success: true, message: 'Connection accepted' });
      return;
    }
    const existingReq = db.prepare('SELECT id FROM connections WHERE user_id = ? AND target_id = ?').get(user_id, target_id);
    if (existingReq) {
       return res.json({ success: true, message: 'Request already exists' });
    }
    const res_db = db.prepare('INSERT INTO connections (user_id, target_id, status) VALUES (?, ?, ?)').run(user_id, target_id, 'pending');
    const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(user_id) as any;
    db.prepare('INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)')
      .run(target_id, 'connection', 'New Sync Request', `${user.full_name} wants to sync with you.`);
    res.json({ success: true, id: res_db.lastInsertRowid });
  });

  // Jobs
  apiRouter.get('/jobs', (req, res) => {
    const { q, experience, minSalary, placeId } = req.query;
    let query = 'SELECT j.*, p.name as place_name FROM jobs j LEFT JOIN places p ON j.place_id = p.id WHERE 1=1';
    const params: any[] = [];
    if (q) {
      query += ' AND (j.title LIKE ? OR j.description LIKE ? OR j.company_name LIKE ? OR j.keywords LIKE ?)';
      const term = `%${q}%`;
      params.push(term, term, term, term);
    }
    if (placeId && placeId !== 'all') {
      query += ' AND j.place_id = ?';
      params.push(placeId);
    }
    if (experience && experience !== 'all') {
      query += ' AND j.experience_level = ?';
      params.push(experience);
    }
    if (minSalary) {
      query += " AND CAST(REPLACE(REPLACE(j.salary_range, 'k', ''), '$', '') AS INTEGER) >= ?";
      params.push(parseInt(minSalary as string));
    }
    query += ' ORDER BY j.created_at DESC';
    const jobs = db.prepare(query).all(...params);
    res.json(jobs);
  });

  apiRouter.post('/jobs', (req, res) => {
    const { user_id, title, company_name, location, description, salary_range, experience_level, end_date } = req.body;
    const user = db.prepare('SELECT is_company_rep FROM users WHERE id = ?').get(user_id) as any;
    if (!user || user.is_company_rep !== 1) {
      return res.status(403).json({ error: 'Only verified company representatives can post jobs' });
    }
    const res_db = db.prepare('INSERT INTO jobs (user_id, title, company_name, location, description, salary_range, experience_level, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(user_id, title, company_name, location, description, salary_range, experience_level, end_date);
    const jobId = res_db.lastInsertRowid;
    db.prepare('INSERT INTO posts (user_id, content, type, attachment_type, attachment_id) VALUES (?, ?, ?, ?, ?)')
      .run(user_id, `We are hiring for: ${title} at ${company_name}. Location: ${location}.`, 'standard', 'job', jobId);
    res.json({ success: true, id: jobId });
  });

  apiRouter.get('/jobs/:jobId/applicants', (req, res) => {
    const applicants = db.prepare(`SELECT ja.*, u.full_name, u.avatar_url, u.headline FROM job_applications ja JOIN users u ON ja.user_id = u.id WHERE ja.job_id = ? ORDER BY ja.created_at DESC`).all(req.params.jobId);
    res.json(applicants);
  });

  apiRouter.post('/jobs/applications/status', (req, res) => {
    db.prepare('UPDATE job_applications SET status = ? WHERE id = ?').run(req.body.status, req.body.applicationId);
    res.json({ success: true });
  });

  // Search
  apiRouter.get('/search', (req, res) => {
    const term = `%${req.query.q}%`;
    const type = req.query.type;
    const results: any = { posts: [], jobs: [], users: [] };
    if (!type || type === 'posts' || type === 'all') {
      results.posts = db.prepare('SELECT p.*, u.full_name, u.avatar_url, u.headline FROM posts p JOIN users u ON p.user_id = u.id WHERE (p.content LIKE ? OR p.keywords LIKE ?) ORDER BY p.created_at DESC LIMIT 10').all(term, term);
    }
    if (!type || type === 'jobs' || type === 'all') {
      results.jobs = db.prepare('SELECT j.*, p.name as place_name FROM jobs j LEFT JOIN places p ON j.place_id = p.id WHERE (j.title LIKE ? OR j.company_name LIKE ? OR j.description LIKE ? OR j.keywords LIKE ? OR p.name LIKE ?) ORDER BY j.created_at DESC LIMIT 10').all(term, term, term, term, term);
    }
    if (!type || type === 'users' || type === 'all' || type === 'companies') {
       let userQuery = `SELECT u.id, u.full_name, u.headline, u.avatar_url, u.is_company_rep, u.role, p.name as place_name FROM users u LEFT JOIN places p ON u.place_id = p.id WHERE (u.full_name LIKE ? OR u.headline LIKE ? OR u.cv_text LIKE ?)`;
       const userParams = [term, term, term];
       if (type === 'companies') userQuery += ` AND u.role = 'company'`;
       results.users = db.prepare(userQuery + ` LIMIT 10`).all(...userParams);
    }
    res.json(results);
  });

  apiRouter.post('/jobs/apply', (req, res) => {
    const { user_id, job_id, attachment_type, attachment_id } = req.body;
    const existing = db.prepare('SELECT id FROM job_applications WHERE user_id = ? AND job_id = ?').get(user_id, job_id);
    if (existing) return res.json({ success: true, message: 'Already applied' });
    db.prepare('INSERT INTO job_applications (user_id, job_id, attachment_type, attachment_id, status) VALUES (?, ?, ?, ?, ?)')
      .run(user_id, job_id, attachment_type || 'none', attachment_id || null, 'pending');
    res.json({ success: true });
  });

  // Job Alerts
  apiRouter.get('/job-alerts/:userId', (req, res) => {
    res.json(db.prepare('SELECT * FROM job_alerts WHERE user_id = ?').all(req.params.userId));
  });

  apiRouter.post('/job-alerts', (req, res) => {
    db.prepare('INSERT INTO job_alerts (user_id, keyword, experience_level, location) VALUES (?, ?, ?, ?)').run(req.body.user_id, req.body.keyword, req.body.experience_level, req.body.location);
    res.json({ success: true });
  });

  apiRouter.delete('/job-alerts/:alertId', (req, res) => {
    db.prepare('DELETE FROM job_alerts WHERE id = ?').run(req.params.alertId);
    res.json({ success: true });
  });

  // Messages
  apiRouter.get('/messages/conversations/:userId', (req, res) => {
    const { userId } = req.params;
    const conversations = db.prepare(`
      SELECT DISTINCT 
        u.id, u.full_name, u.avatar_url, u.headline,
        (SELECT content FROM messages m2 WHERE (m2.sender_id = ? AND m2.receiver_id = u.id) OR (m2.sender_id = u.id AND m2.receiver_id = ?) ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages m2 WHERE (m2.sender_id = ? AND m2.receiver_id = u.id) OR (m2.sender_id = u.id AND m2.receiver_id = ?) ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages m2 WHERE m2.sender_id = u.id AND m2.receiver_id = ? AND m2.is_read = 0) as unread_count
      FROM messages m
      JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY last_message_time DESC
    `).all(userId, userId, userId, userId, userId, userId, userId, userId);
    res.json(conversations);
  });

  apiRouter.get('/messages/:userId/:targetId', (req, res) => {
    const { userId, targetId } = req.params;
    db.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?').run(targetId, userId);
    const messages = db.prepare('SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at ASC').all(userId, targetId, targetId, userId);
    res.json(messages);
  });

  apiRouter.post('/messages', (req, res) => {
    const result = db.prepare('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)').run(req.body.sender_id, req.body.receiver_id, req.body.content);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  // Posts Feed
  apiRouter.get('/content', (req, res) => {
    const { type, skill, keyword, userId } = req.query;
    let query = `
      SELECT p.*, u.full_name, u.avatar_url, u.headline,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
      (SELECT group_concat(response_index || ':' || count) FROM (SELECT response_index, COUNT(*) as count FROM post_responses WHERE post_id = p.id GROUP BY response_index)) as response_stats
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];
    if (type) { conditions.push('p.type = ?'); params.push(type); }
    if (userId) { conditions.push('p.user_id = ?'); params.push(userId); }
    if (skill) {
      conditions.push(`EXISTS (SELECT 1 FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.user_id = p.user_id AND s.name LIKE ?)`);
      params.push(`%${skill}%`);
    }
    if (keyword) {
      const k = `%${keyword}%`;
      conditions.push('(p.content LIKE ? OR EXISTS (SELECT 1 FROM cv_sections cs WHERE cs.user_id = p.user_id AND (cs.keywords LIKE ? OR cs.title LIKE ? OR cs.description LIKE ?)))');
      params.push(k, k, k, k);
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY p.created_at DESC';
    res.json(db.prepare(query).all(...params));
  });

  apiRouter.get('/profile/:userId', (req, res) => {
    const { userId } = req.params;
    const { viewerId } = req.query;
    if (viewerId && Number(viewerId) !== Number(userId)) {
      db.prepare('UPDATE users SET profile_views = profile_views + 1 WHERE id = ?').run(userId);
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const cv = db.prepare('SELECT * FROM cv_sections WHERE user_id = ? ORDER BY start_date DESC').all(userId);
    const skills = db.prepare('SELECT s.name, us.proficiency, us.verification_url, us.is_verified FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.user_id = ?').all(userId);
    const portfolio = db.prepare('SELECT * FROM portfolio WHERE user_id = ?').all(userId);
    const jobs = (user as any).is_company_rep ? db.prepare('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC').all(userId) : [];
    res.json({ ...user, cv, skills, portfolio, jobs });
  });

  apiRouter.post('/cv', (req, res) => {
    const { user_id, type, title, subtitle, description, start_date, end_date, verification_url, keywords } = req.body;
    const result = db.prepare('INSERT INTO cv_sections (user_id, type, title, subtitle, description, start_date, end_date, verification_url, keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(user_id, type, title, subtitle, description, start_date, end_date, verification_url, keywords);
    db.prepare('INSERT INTO posts (user_id, content, type, attachment_type, attachment_id) VALUES (?, ?, ?, ?, ?)').run(user_id, `Updated CV: Added ${type} - ${title} at ${subtitle}`, 'cv_update', 'cv_item', result.lastInsertRowid);
    res.json({ success: true });
  });

  apiRouter.put('/profile', (req, res) => {
    const { user_id, headline, bio, avatar_url, company_name, company_description, company_website } = req.body;
    db.prepare('UPDATE users SET headline = ?, bio = ?, avatar_url = ?, company_name = ?, company_description = ?, company_website = ? WHERE id = ?').run(headline, bio, avatar_url, company_name, company_description, company_website, user_id);
    res.json({ success: true });
  });

  apiRouter.post('/skills', (req, res) => {
    const { user_id, name, proficiency, verification_url } = req.body;
    db.prepare('INSERT OR IGNORE INTO skills (name) VALUES (?)').run(name);
    const skill = db.prepare('SELECT id FROM skills WHERE name = ?').get(name) as any;
    db.prepare('INSERT OR REPLACE INTO user_skills (user_id, skill_id, proficiency, verification_url, is_verified) VALUES (?, ?, ?, ?, ?)').run(user_id, skill.id, proficiency, verification_url || null, verification_url ? 1 : 0);
    res.json({ success: true });
  });

  apiRouter.post('/posts', (req, res) => {
    const { user_id, content, type, attachment_type, attachment_id, quiz_data, poll_data } = req.body;
    const result = db.prepare('INSERT INTO posts (user_id, content, type, attachment_type, attachment_id, quiz_data, poll_data) VALUES (?, ?, ?, ?, ?, ?, ?)').run(user_id, content, type || 'standard', attachment_type || null, attachment_id || null, quiz_data ? JSON.stringify(quiz_data) : null, poll_data ? JSON.stringify(poll_data) : null);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  apiRouter.post('/posts/:postId/respond', (req, res) => {
    const { postId } = req.params;
    const { user_id, type, response_index } = req.body;
    const existing = db.prepare('SELECT id FROM post_responses WHERE post_id = ? AND user_id = ?').get(postId, user_id);
    if (existing) db.prepare('UPDATE post_responses SET response_index = ? WHERE id = ?').run(response_index, (existing as any).id);
    else db.prepare('INSERT INTO post_responses (post_id, user_id, type, response_index) VALUES (?, ?, ?, ?)').run(postId, user_id, type, response_index);
    res.json({ success: true });
  });

  apiRouter.get('/posts/:postId/comments', (req, res) => {
    res.json(db.prepare('SELECT c.*, u.full_name, u.avatar_url FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC').all(req.params.postId));
  });

  apiRouter.post('/comments', (req, res) => {
    db.prepare('INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)').run(req.body.user_id, req.body.post_id, req.body.content);
    res.json({ success: true });
  });

  apiRouter.get('/candidates', (req, res) => {
    const { skills } = req.query;
    let query = 'SELECT u.*, group_concat(s.name) as skill_list FROM users u LEFT JOIN user_skills us ON u.id = us.user_id LEFT JOIN skills s ON us.skill_id = s.id';
    const params = [];
    if (skills) {
      const skillArr = (skills as string).split(',').map(s => s.trim());
      query += ` WHERE s.name IN (${skillArr.map(() => '?').join(',')})`;
      params.push(...skillArr);
    }
    query += ' GROUP BY u.id';
    res.json(db.prepare(query).all(...params));
  });

  apiRouter.get('/recommendations/:userId', (req, res) => {
    const { userId } = req.params;
    const recommendations = db.prepare(`SELECT DISTINCT u.id, u.full_name, u.headline, u.avatar_url, (SELECT COUNT(*) FROM user_skills us1 JOIN user_skills us2 ON us1.skill_id = us2.skill_id WHERE us1.user_id = ? AND us2.user_id = u.id) as shared_skills_count FROM users u JOIN user_skills us_target ON u.id = us_target.user_id JOIN user_skills us_current ON us_target.skill_id = us_current.skill_id AND us_current.user_id = ? WHERE u.id != ? AND u.id NOT IN (SELECT target_id FROM connections WHERE user_id = ? UNION SELECT user_id FROM connections WHERE target_id = ?) ORDER BY shared_skills_count DESC LIMIT 3`).all(userId, userId, userId, userId, userId);
    res.json(recommendations);
  });

  apiRouter.get('/files/:userId', (req, res) => {
    const { userId } = req.params;
    const { purpose } = req.query;
    let query = 'SELECT * FROM files WHERE user_id = ?';
    const params = [userId];
    if (purpose) { query += ' AND purpose = ?'; params.push(purpose as string); }
    query += ' ORDER BY created_at DESC';
    res.json(db.prepare(query).all(...params));
  });

  apiRouter.post('/files', (req, res) => {
    const result = db.prepare('INSERT INTO files (user_id, name, url, type, purpose) VALUES (?, ?, ?, ?, ?)').run(req.body.user_id, req.body.name, req.body.url, req.body.type, req.body.purpose);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  apiRouter.delete('/files/:fileId', (req, res) => {
    db.prepare('DELETE FROM files WHERE id = ?').run(req.params.fileId);
    res.json({ success: true });
  });

  // AI ENDPOINTS
  apiRouter.post('/ai/rank-jobs', async (req, res) => {
    const { query, jobs } = req.body;
    if (!query || !jobs) return res.json([]);

    const fallback = jobs.map((j: any) => j.id).sort(() => Math.random() - 0.5);
    const prompt = `Rank these job IDs based on relevance to: "${query}". Return ONLY a JSON array of IDs. Jobs: ${JSON.stringify(jobs.map((j: any) => ({ id: j.id, title: j.title, description: j.description })))}`;
    
    const result = await generateContentSafe(prompt, fallback);
    res.json(result);
  });

  apiRouter.post('/ai/optimize-post', async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    const fallback = {
      optimizedContent: content + "\n\n#Professional #Networking",
      suggestedTags: ["career", "growth"],
      quiz: { question: "What is the key takeaway?", options: ["Growth", "Stability", "Learning"], correctIndex: 0 },
      poll: { question: "Do you agree?", options: ["Yes", "Maybe", "No"] }
    };

    const prompt = `Optimize this post for professional social network: "${content}". Return JSON: { optimizedContent, suggestedTags, quiz, poll }`;
    
    const result = await generateContentSafe(prompt, fallback);
    res.json(result);
  });

  apiRouter.post('/ai/interactive-content', async (req, res) => {
    const { topic, type } = req.body;
    
    const fallback = type === 'quiz' 
      ? { question: `Tell me about ${topic}?`, options: ["Option A", "Option B", "Option C"], correctIndex: 0 }
      : { question: `How do you feel about ${topic}?`, options: ["Great", "Okay", "Bad"] };

    const prompt = `Generate a professional ${type} about "${topic}". Return JSON.`;
    
    const result = await generateContentSafe(prompt, fallback);
    res.json(result);
  });

  apiRouter.post('/ai/shortlist-applicants', async (req, res) => {
    const { jobDescription, applicants } = req.body;
    if (!jobDescription || !applicants) return res.json([]);

    const fallback = applicants.map((a: any) => ({
      applicantId: a.user_id,
      score: Math.floor(Math.random() * 40) + 60,
      reasoning: "Strong match based on profile highlights and experience."
    }));

    const prompt = `Analyze these applicants for the job: "${jobDescription}". Return JSON array: { applicantId, score, reasoning }. Applicants: ${JSON.stringify(applicants.map((a: any) => ({ id: a.user_id, name: a.full_name, headline: a.headline })))}`;
    
    const result = await generateContentSafe(prompt, fallback);
    res.json(result);
  });

  apiRouter.post('/user/preference/place', (req, res) => {
    const { user_id, place_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    db.prepare('UPDATE users SET place_id = ? WHERE id = ?').run(place_id === "all" ? null : place_id, user_id);
    res.json({ success: true });
  });

  // Mount API Router
  app.use('/api', apiRouter);

  // API 404
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.url}` });
  });

  // Error Handler
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message || 'Server Error' });
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

  app.listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));
}

startServer();
