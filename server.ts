import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('prosync.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    full_name TEXT,
    headline TEXT,
    avatar_url TEXT,
    bio TEXT,
    profile_views INTEGER DEFAULT 0,
    is_company_rep INTEGER DEFAULT 0,
    company_name TEXT,
    company_description TEXT,
    company_website TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    keywords TEXT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    location TEXT,
    description TEXT,
    salary_range TEXT,
    experience_level TEXT, -- 'Junior', 'Mid', 'Senior', 'Lead'
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS job_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    job_id INTEGER,
    attachment_type TEXT, -- 'cv_item', 'portfolio_item', 'none'
    attachment_id INTEGER,
    status TEXT, -- 'pending', 'reviewed', 'hired', 'shortlisted'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'comment', 'connection', 'application', 'mention'
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

  CREATE TABLE IF NOT EXISTS job_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    keyword TEXT,
    experience_level TEXT, -- 'all', 'Junior', 'Mid', 'Senior', 'Lead'
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migrations
try { db.prepare('ALTER TABLE user_skills ADD COLUMN verification_url TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE user_skills ADD COLUMN is_verified INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN company_name TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN company_description TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN company_website TEXT').run(); } catch(e) {}

// Seed Data
const seedData = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (seedData.count === 0) {
  const users = [
    ['demo@prosync.com', 'Demo User', 'Senior Software Engineer | System Architect', 'Passionate about building scalable systems and finding great opportunities.', 0],
    ['alex@prosync.com', 'Alex Rivera', 'Senior Frontend Engineer | UI Architect', 'Creative soul with a passion for precise code and human-centric design.', 0],
    ['sarah@prosync.com', 'Sarah Chen', 'Full Stack Developer | AI Researcher', 'Building scalable architectures and exploring the frontiers of ML.', 0],
    ['recruiter@techcorp.com', 'TechCorp Inc.', 'Verified TechCorp Representative', 'Leading technology company building the future. We are hiring!', 1],
  ];

  const userIds: Record<string, number> = {};

  for (const [email, name, headline, bio, is_company_rep] of users) {
    const res = db.prepare('INSERT INTO users (email, full_name, headline, bio, is_company_rep) VALUES (?, ?, ?, ?, ?)').run(email, name, headline, bio, is_company_rep);
    const userId = res.lastInsertRowid as number;
    userIds[email as string] = userId;
    
    // Skills
    db.prepare('INSERT OR IGNORE INTO skills (name) VALUES (?)').run('React');
    db.prepare('INSERT OR IGNORE INTO skills (name) VALUES (?)').run('TypeScript');
    db.prepare('INSERT OR IGNORE INTO skills (name) VALUES (?)').run('Node.js');
    
    const skillRes = db.prepare('SELECT id FROM skills WHERE name = ?').get('React') as any;
    db.prepare('INSERT INTO user_skills (user_id, skill_id, proficiency) VALUES (?, ?, ?)').run(userId, skillRes.id, 5);

    if (is_company_rep === 0) {
      // CV
      db.prepare(`
        INSERT INTO cv_sections (user_id, type, title, subtitle, description, start_date, keywords)
        VALUES (?, 'experience', 'Lead Engineer', 'TechCorp Systems', 'Spearheaded the redesign of the core dashboard reaching 2M users.', '2022-01-01', 'react, leadership, architecture')
      `).run(userId);
    }

    // Initial Posts
    db.prepare(`
      INSERT INTO posts (user_id, content, type)
      VALUES (?, 'Just joined ProSync! Looking forward to sharing my verified professional journey here. #hiring #engineering', 'standard')
    `).run(userId);
  }

  const techCorpId = userIds['recruiter@techcorp.com'];
  db.prepare(`
    INSERT INTO jobs (user_id, title, company_name, location, description, salary_range, experience_level)
    VALUES (?, 'Senior Full Stack Engineer', 'TechCorp Inc.', 'Remote / San Francisco', 'Looking for an experienced builder to help scale our core product. Must have strong TypeScript and system architecture skills.', '$150k - $200k', 'Senior')
  `).run(techCorpId);

  // Seed messages
  const demoId = userIds['demo@prosync.com'];
  const alexId = userIds['alex@prosync.com'];
  
  db.prepare('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)').run(alexId, demoId, 'Hey Demo! Would love to chat about the recent frontend roles opening up. Let me know when you have time!');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Mock Auth (In a real app, use JWT/Sessions and Hashing)
  app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      // Auto-register for demo purposes if user doesn't exist
      const name = email.split('@')[0];
      const result = db.prepare('INSERT INTO users (email, full_name, headline) VALUES (?, ?, ?)')
        .run(email, name, 'Professional Individual');
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }
    res.json(user);
  });

  // Notifications
  app.get('/api/notifications/:userId', (req, res) => {
    const { userId } = req.params;
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId);
    res.json(notifications);
  });

  app.post('/api/notifications/read', (req, res) => {
    const { notificationId } = req.body;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);
    res.json({ success: true });
  });

  // Connections
  app.post('/api/connections', (req, res) => {
    const { user_id, target_id } = req.body;
    
    // Check if reverse connection exists
    const existing = db.prepare('SELECT id FROM connections WHERE user_id = ? AND target_id = ?').get(target_id, user_id);
    if (existing) {
      db.prepare('UPDATE connections SET status = ? WHERE id = ?').run('accepted', (existing as any).id);
      res.json({ success: true, message: 'Connection accepted' });
      return;
    }

    // Check if target connection already exists
    const existingReq = db.prepare('SELECT id FROM connections WHERE user_id = ? AND target_id = ?').get(user_id, target_id);
    if (existingReq) {
      res.json({ success: true, message: 'Request already exists' });
      return;
    }

    const res_db = db.prepare('INSERT INTO connections (user_id, target_id, status) VALUES (?, ?, ?)').run(user_id, target_id, 'pending');
    
    // Notify target
    const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(user_id) as any;
    db.prepare('INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)')
      .run(target_id, 'connection', 'New Sync Request', `${user.full_name} wants to sync with you.`);
    
    res.json({ success: true, id: res_db.lastInsertRowid });
  });

  // Jobs
  app.get('/api/jobs', (req, res) => {
    const { q, experience, minSalary } = req.query;
    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params: any[] = [];

    if (q) {
      query += ' AND (title LIKE ? OR description LIKE ? OR company_name LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (experience && experience !== 'all') {
      query += ' AND experience_level = ?';
      params.push(experience);
    }

    if (minSalary) {
      // Rough salary filtering assuming $XXXk format
      query += " AND CAST(REPLACE(REPLACE(salary_range, 'k', ''), '$', '') AS INTEGER) >= ?";
      params.push(parseInt(minSalary as string));
    }

    query += ' ORDER BY created_at DESC';
    const jobs = db.prepare(query).all(...params);
    res.json(jobs);
  });

  app.post('/api/jobs', (req, res) => {
    const { user_id, title, company_name, location, description, salary_range, experience_level, end_date } = req.body;
    
    // Ensure user is a company rep
    const user = db.prepare('SELECT is_company_rep FROM users WHERE id = ?').get(user_id) as any;
    if (!user || user.is_company_rep !== 1) {
      return res.status(403).json({ error: 'Only verified company representatives can post jobs' });
    }

    const res_db = db.prepare(`
      INSERT INTO jobs (user_id, title, company_name, location, description, salary_range, experience_level, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, title, company_name, location, description, salary_range, experience_level, end_date);
    const jobId = res_db.lastInsertRowid;
    
    // Create a post automatically for the new job
    db.prepare(`
      INSERT INTO posts (user_id, content, type, attachment_type, attachment_id)
      VALUES (?, ?, 'standard', 'job', ?)
    `).run(user_id, `We are hiring for: ${title} at ${company_name}. Location: ${location}.`, jobId);

    // NOTIFY USERS
    // 1. Match users via Profile (Headline/Bio)
    const users = db.prepare('SELECT id, headline, bio FROM users WHERE id != ?').all(user_id) as any[];
    for (const u of users) {
      const matchText = `${u.headline} ${u.bio}`.toLowerCase();
      const jobText = `${title} ${description}`.toLowerCase();
      
      // Simple keyword matching for profile
      const keywords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const isMatch = keywords.some(k => matchText.includes(k));

      if (isMatch) {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, content, link)
          VALUES (?, 'job_match', 'New Matching Job', ?, ?)
        `).run(u.id, `Based on your profile: ${title} at ${company_name}`, `/jobs?id=${jobId}`);
      }
    }

    // 2. Match users via Job Alerts
    const alerts = db.prepare('SELECT user_id, keyword, experience_level, location FROM job_alerts').all() as any[];
    for (const a of alerts) {
      if (a.user_id === user_id) continue;

      let alertMatch = true;
      if (a.keyword && !(`${title} ${description}`.toLowerCase().includes(a.keyword.toLowerCase()))) alertMatch = false;
      if (a.experience_level !== 'all' && a.experience_level !== experience_level) alertMatch = false;
      if (a.location && !location.toLowerCase().includes(a.location.toLowerCase())) alertMatch = false;

      if (alertMatch) {
         // Avoid double notification if already notified via profile
         const alreadyNotified = db.prepare('SELECT id FROM notifications WHERE user_id = ? AND type = ? AND link = ?').get(a.user_id, 'job_match', `/jobs?id=${jobId}`);
         if (!alreadyNotified) {
            db.prepare(`
              INSERT INTO notifications (user_id, type, title, content, link)
              VALUES (?, 'job_alert', 'Job Alert Match', ?, ?)
            `).run(a.user_id, `Matches your alert: ${title} at ${company_name}`, `/jobs?id=${jobId}`);
         }
      }
    }

    res.json({ success: true, id: jobId });
  });

  app.get('/api/jobs/:jobId/applicants', (req, res) => {
    const { jobId } = req.params;
    const applicants = db.prepare(`
      SELECT ja.*, u.full_name, u.avatar_url, u.headline
      FROM job_applications ja
      JOIN users u ON ja.user_id = u.id
      WHERE ja.job_id = ?
      ORDER BY ja.created_at DESC
    `).all(jobId);
    res.json(applicants);
  });

  app.post('/api/jobs/applications/status', (req, res) => {
    const { applicationId, status } = req.body;
    db.prepare('UPDATE job_applications SET status = ? WHERE id = ?').run(status, applicationId);
    res.json({ success: true });
  });

  app.get('/api/search', (req, res) => {
    const { q, type } = req.query;
    const term = `%${q}%`;
    const results: any = { posts: [], jobs: [], users: [] };

    if (!type || type === 'posts' || type === 'all') {
      results.posts = db.prepare(`
        SELECT p.*, u.full_name, u.avatar_url, u.headline
        FROM posts p JOIN users u ON p.user_id = u.id
        WHERE p.content LIKE ? ORDER BY p.created_at DESC LIMIT 10
      `).all(term);
    }
    if (!type || type === 'jobs' || type === 'all') {
      results.jobs = db.prepare(`
        SELECT * FROM jobs WHERE title LIKE ? OR company_name LIKE ? OR description LIKE ?
        ORDER BY created_at DESC LIMIT 10
      `).all(term, term, term);
    }
    if (!type || type === 'users' || type === 'all' || type === 'companies') {
       let userQuery = `SELECT id, full_name, headline, avatar_url, is_company_rep FROM users WHERE (full_name LIKE ? OR headline LIKE ?)`;
       const userParams = [term, term];
       
       if (type === 'companies') {
         userQuery += ` AND is_company_rep = 1`;
       }
       
       results.users = db.prepare(userQuery + ` LIMIT 10`).all(...userParams);
    }

    res.json(results);
  });

  app.post('/api/jobs/apply', (req, res) => {
    const { user_id, job_id, attachment_type, attachment_id } = req.body;
    
    // Check if already applied
    const existing = db.prepare('SELECT id FROM job_applications WHERE user_id = ? AND job_id = ?').get(user_id, job_id);
    if (existing) {
      return res.json({ success: true, message: 'Already applied' });
    }

    db.prepare('INSERT INTO job_applications (user_id, job_id, attachment_type, attachment_id, status) VALUES (?, ?, ?, ?, ?)')
      .run(user_id, job_id, attachment_type || 'none', attachment_id || null, 'pending');
    
    // Notify poster
    const job = db.prepare('SELECT user_id, title FROM jobs WHERE id = ?').get(job_id) as any;
    const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(user_id) as any;
    
    let attachmentNote = '';
    if (attachment_type === 'cv_item') attachmentNote = ' with a relevant CV highlight';
    if (attachment_type === 'portfolio_item') attachmentNote = ' with a portfolio project';

    db.prepare('INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)')
      .run(job.user_id, 'application', 'Job Application', `${user.full_name} applied to your job: ${job.title}${attachmentNote}`);
    
    res.json({ success: true });
  });

  // JOB ALERTS
  app.get('/api/job-alerts/:userId', (req, res) => {
    const alerts = db.prepare('SELECT * FROM job_alerts WHERE user_id = ?').all(req.params.userId);
    res.json(alerts);
  });

  app.post('/api/job-alerts', (req, res) => {
    const { user_id, keyword, experience_level, location } = req.body;
    db.prepare(`
      INSERT INTO job_alerts (user_id, keyword, experience_level, location)
      VALUES (?, ?, ?, ?)
    `).run(user_id, keyword, experience_level, location);
    res.json({ success: true });
  });

  app.delete('/api/job-alerts/:alertId', (req, res) => {
    db.prepare('DELETE FROM job_alerts WHERE id = ?').run(req.params.alertId);
    res.json({ success: true });
  });

  // Messages
  app.get('/api/messages/conversations/:userId', (req, res) => {
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

  app.get('/api/messages/:userId/:targetId', (req, res) => {
    const { userId, targetId } = req.params;
    db.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?').run(targetId, userId);
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?) 
      ORDER BY created_at ASC
    `).all(userId, targetId, targetId, userId);
    res.json(messages);
  });

  app.post('/api/messages', (req, res) => {
    const { sender_id, receiver_id, content } = req.body;
    const res_db = db.prepare('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)').run(sender_id, receiver_id, content);
    
    // Notify receiver
    const sender = db.prepare('SELECT full_name FROM users WHERE id = ?').get(sender_id) as any;
    db.prepare('INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)')
      .run(receiver_id, 'message', 'New Message', `${sender.full_name} sent you a message: ${content.substring(0, 20)}...`);
    
    res.json({ success: true, id: res_db.lastInsertRowid });
  });

  // Unified Content Endpoint (Feed + Search)
  app.get('/api/content', (req, res) => {
    const { type, skill, keyword, userId } = req.query;
    
    let query = `
      SELECT p.*, u.full_name, u.avatar_url, u.headline,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `;
    const params: any[] = [];

    const conditions: string[] = [];

    if (type) {
      conditions.push('p.type = ?');
      params.push(type);
    }

    if (userId) {
      conditions.push('p.user_id = ?');
      params.push(userId);
    }

    if (skill) {
      conditions.push(`EXISTS (
        SELECT 1 FROM user_skills us 
        JOIN skills s ON us.skill_id = s.id 
        WHERE us.user_id = p.user_id AND s.name LIKE ?
      )`);
      params.push(`%${skill}%`);
    }

    if (keyword) {
      if ((keyword as string).startsWith('#')) {
        conditions.push('p.content LIKE ?');
        params.push(`%${keyword}%`);
      } else {
        conditions.push('(p.content LIKE ? OR EXISTS (SELECT 1 FROM cv_sections cs WHERE cs.user_id = p.user_id AND (cs.keywords LIKE ? OR cs.title LIKE ? OR cs.description LIKE ?)))');
        const k = `%${keyword}%`;
        params.push(k, k, k, k);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';

    const posts = db.prepare(query).all(...params);
    res.json(posts);
  });

  app.get('/api/profile/:userId', (req, res) => {
    const { userId } = req.params;
    const viewerId = req.query.viewerId;

    if (viewerId && Number(viewerId) !== Number(userId)) {
      db.prepare('UPDATE users SET profile_views = profile_views + 1 WHERE id = ?').run(userId);
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const cv = db.prepare('SELECT * FROM cv_sections WHERE user_id = ? ORDER BY start_date DESC').all(userId);
    const skills = db.prepare(`
      SELECT s.name, us.proficiency, us.verification_url, us.is_verified 
      FROM user_skills us 
      JOIN skills s ON us.skill_id = s.id 
      WHERE us.user_id = ?
    `).all(userId);
    const portfolio = db.prepare('SELECT * FROM portfolio WHERE user_id = ?').all(userId);
    const jobs = (user as any).is_company_rep ? db.prepare('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC').all(userId) : [];

    // Analytics
    const connectionsReceived = db.prepare('SELECT COUNT(*) as count FROM connections WHERE target_id = ?').get(userId) as any;
    const postEngagement = db.prepare(`
      SELECT COUNT(*) as count 
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE p.user_id = ?
    `).get(userId) as any;

    res.json({ 
      ...user, 
      cv, 
      skills, 
      portfolio,
      jobs,
      analytics: {
        profile_views: (user as any).profile_views,
        connections_received: connectionsReceived.count,
        engagement: postEngagement.count
      }
    });
  });

  app.post('/api/cv', (req, res) => {
    const { user_id, type, title, subtitle, description, start_date, end_date, verification_url, keywords } = req.body;
    const result = db.prepare(`
      INSERT INTO cv_sections (user_id, type, title, subtitle, description, start_date, end_date, verification_url, keywords)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, type, title, subtitle, description, start_date, end_date, verification_url, keywords);
    
    // Also create a post for the feed
    db.prepare(`
      INSERT INTO posts (user_id, content, type, attachment_type, attachment_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, `Updated CV: Added ${type} - ${title} at ${subtitle}`, 'cv_update', 'cv_item', result.lastInsertRowid);

    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.put('/api/profile', (req, res) => {
    const { user_id, headline, bio, avatar_url, company_name, company_description, company_website } = req.body;
    db.prepare('UPDATE users SET headline = ?, bio = ?, avatar_url = ?, company_name = ?, company_description = ?, company_website = ? WHERE id = ?')
      .run(headline, bio, avatar_url, company_name, company_description, company_website, user_id);
    res.json({ success: true });
  });

  app.post('/api/skills', (req, res) => {
    const { user_id, name, proficiency, verification_url } = req.body;
    db.prepare('INSERT OR IGNORE INTO skills (name) VALUES (?)').run(name);
    const skill = db.prepare('SELECT id FROM skills WHERE name = ?').get(name) as any;
    db.prepare('INSERT OR REPLACE INTO user_skills (user_id, skill_id, proficiency, verification_url, is_verified) VALUES (?, ?, ?, ?, ?)')
      .run(user_id, skill.id, proficiency, verification_url || null, verification_url ? 1 : 0);
    res.json({ success: true });
  });

  app.post('/api/skills/verify', (req, res) => {
    const { user_id, name, verification_url } = req.body;
    const skill = db.prepare('SELECT id FROM skills WHERE name = ?').get(name) as any;
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    
    db.prepare('UPDATE user_skills SET verification_url = ?, is_verified = 1 WHERE user_id = ? AND skill_id = ?')
      .run(verification_url, user_id, skill.id);
    res.json({ success: true });
  });

  app.post('/api/portfolio', (req, res) => {
    const { user_id, title, url, description, thumbnail_url } = req.body;
    db.prepare('INSERT INTO portfolio (user_id, title, url, description, thumbnail_url) VALUES (?, ?, ?, ?, ?)')
      .run(user_id, title, url, description, thumbnail_url);
    res.json({ success: true });
  });

  app.post('/api/posts', (req, res) => {
    const { user_id, content, type, attachment_type, attachment_id } = req.body;
    const result = db.prepare(`
      INSERT INTO posts (user_id, content, type, attachment_type, attachment_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, content, type || 'standard', attachment_type || null, attachment_id || null);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.get('/api/posts/:postId/comments', (req, res) => {
    const { postId } = req.params;
    const comments = db.prepare(`
      SELECT c.*, u.full_name, u.avatar_url 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.post_id = ? 
      ORDER BY c.created_at ASC
    `).all(postId);
    res.json(comments);
  });

  app.post('/api/comments', (req, res) => {
    const { user_id, post_id, content } = req.body;
    db.prepare('INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)').run(user_id, post_id, content);
    
    // Notify post owner
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(post_id) as any;
    const commentator = db.prepare('SELECT full_name FROM users WHERE id = ?').get(user_id) as any;
    if (post.user_id !== user_id) {
      db.prepare('INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)')
        .run(post.user_id, 'comment', 'New Comment', `${commentator.full_name} commented on your post.`);
    }

    res.json({ success: true });
  });

  app.get('/api/candidates', (req, res) => {
    const { skills, minExp } = req.query; // skills is comma separated
    let query = `
      SELECT u.*, 
      group_concat(s.name) as skill_list
      FROM users u
      LEFT JOIN user_skills us ON u.id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.id
    `;
    
    const params: any[] = [];
    if (skills) {
      const skillArr = (skills as string).split(',').map(s => s.trim());
      query += ` WHERE s.name IN (${skillArr.map(() => '?').join(',')})`;
      params.push(...skillArr);
    }

    query += ' GROUP BY u.id';
    
    const candidates = db.prepare(query).all(...params);
    res.json(candidates);
  });

  app.get('/api/recommendations/:userId', (req, res) => {
    const { userId } = req.params;
    
    const recommendations = db.prepare(`
      SELECT DISTINCT u.id, u.full_name, u.headline, u.avatar_url,
      (
        SELECT COUNT(*) 
        FROM user_skills us1 
        JOIN user_skills us2 ON us1.skill_id = us2.skill_id 
        WHERE us1.user_id = ? AND us2.user_id = u.id
      ) as shared_skills_count
      FROM users u
      JOIN user_skills us_target ON u.id = us_target.user_id
      JOIN user_skills us_current ON us_target.skill_id = us_current.skill_id AND us_current.user_id = ?
      WHERE u.id != ? 
      AND u.id NOT IN (
        SELECT target_id FROM connections WHERE user_id = ? 
        UNION 
        SELECT user_id FROM connections WHERE target_id = ?
      )
      ORDER BY shared_skills_count DESC
      LIMIT 3
    `).all(userId, userId, userId, userId, userId);
    
    res.json(recommendations);
  });

  // Global Error Handler for APIs
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  // --- VITE MIDDLEWARE ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
