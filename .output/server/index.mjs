globalThis.__nitro_main__ = import.meta.url;
import { a as defineLazyEventHandler, c as FastResponse, i as callMiddleware, n as HTTPError, o as toEventHandler, s as toMiddleware, t as H3Core } from "./_libs/h3+rou3+srvx+unenv.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
import { t as getContext } from "./_libs/unctx+unenv.mjs";
import { t as Hono } from "./_libs/hono.mjs";
import { n as _RecordId, t as Surreal } from "./_libs/surrealdb.mjs";
import { n as Type, t as GoogleGenAI } from "./_libs/google__genai+p-retry+retry.mjs";
import { t as bcryptjs_default } from "./_libs/bcryptjs.mjs";
import process from "node:process";
//#region #nitro-vite-setup
globalThis.__nitro_vite_envs__ = {};
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/assets/index-BNwHPjv1.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"d226-6ETWD7Q9AzYJYhq82WacvCgl/ag\"",
		"mtime": "2026-05-11T13:13:45.710Z",
		"size": 53798,
		"path": "../public/assets/index-BNwHPjv1.css"
	},
	"/assets/index-B7TklI1d.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"af626-jR/ihWOY+DnPsU9qZu9lLqH3KGo\"",
		"mtime": "2026-05-11T13:13:45.710Z",
		"size": 718374,
		"path": "../public/assets/index-B7TklI1d.js"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
getContext("nitro-app", {
	asyncContext: void 0,
	AsyncLocalStorage: void 0
});
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region server/lib/db/db.ts
var SurrealAdapter = class {
	db;
	constructor(db) {
		this.db = db;
	}
	toRecordId(id) {
		if (id.includes(":")) {
			const [tb, val] = id.split(":");
			return new _RecordId(tb, val);
		}
		return id;
	}
	stringifyId(id) {
		if (!id) return "";
		return id.toString();
	}
	async get(table, id) {
		try {
			const recordId = id.includes(":") ? id : `${table}:${id}`;
			return await this.db.select(recordId) || null;
		} catch (e) {
			console.error(`DB Get Error [${table}:${id}]:`, e);
			return null;
		}
	}
	async list(table, options = {}) {
		let sql = `SELECT * FROM ${table}`;
		if (options.filter) sql += ` WHERE ${options.filter}`;
		if (options.order) sql += ` ORDER BY ${options.order}`;
		if (options.limit) sql += ` LIMIT ${options.limit}`;
		try {
			const data = (await this.db.query(sql, options.params || {}))?.[0] || [];
			return Array.isArray(data) ? data : [];
		} catch (e) {
			console.error(`DB List Error [${table}]:`, e);
			return [];
		}
	}
	async insert(table, data) {
		try {
			const { id, ...content } = data;
			let sql;
			let params;
			if (id) {
				const recordId = id.includes(":") ? id : `${table}:${id}`;
				sql = "CREATE type::record($id) CONTENT $data";
				params = {
					id: recordId,
					data: content
				};
			} else {
				sql = `CREATE ${table} CONTENT $data`;
				params = { data: content };
			}
			const result = (await this.db.query(sql, params))?.[0];
			if (!result || result.length === 0) throw new Error(`Failed to insert into ${table}`);
			return result[0];
		} catch (e) {
			console.error(`DB Insert Error [${table}]:`, e);
			throw e;
		}
	}
	async update(table, id, data) {
		try {
			const recordId = id.includes(":") ? id : `${table}:${id}`;
			const result = (await this.db.query("UPDATE type::record($id) MERGE $data", {
				id: recordId,
				data
			}))?.[0];
			if (!result || result.length === 0) throw new Error(`Failed to update ${id}`);
			return result[0];
		} catch (e) {
			console.error(`DB Update Error [${id}]:`, e);
			throw e;
		}
	}
	async edit(table, id, data) {
		return this.update(table, id, data);
	}
	async upsert(table, id, data) {
		try {
			const recordId = id.includes(":") ? id : `${table}:${id}`;
			const [result] = await this.db.query("UPSERT type::record($id) CONTENT $data", {
				id: recordId,
				data
			});
			if (!result || result.length === 0) throw new Error(`Failed to upsert ${recordId}`);
			return result[0];
		} catch (e) {
			console.error(`DB Upsert Error [${id}]:`, e);
			throw e;
		}
	}
	async delete(table, id) {
		try {
			const recordId = id.includes(":") ? id : `${table}:${id}`;
			await this.db.delete(recordId);
		} catch (e) {
			console.error(`DB Delete Error [${id}]:`, e);
			throw e;
		}
	}
	async increment(table, id, field, amount = 1) {
		try {
			const recordId = id.includes(":") ? id : `${table}:${id}`;
			await this.db.query(`UPDATE type::record($id) SET ${field} = (${field} || 0) + $amount`, {
				id: recordId,
				amount
			});
		} catch (e) {
			console.error(`DB Increment Error [${id}.${field}]:`, e);
			throw e;
		}
	}
	async relate(from, edge, to, data = {}) {
		try {
			await this.db.query(`RELATE type::record($from)->${edge}->type::record($to) CONTENT $data`, {
				from,
				to,
				data
			});
		} catch (e) {
			console.error(`DB Relate Error [${from} -> ${edge} -> ${to}]:`, e);
			throw e;
		}
	}
	async search(table, term, fields) {
		if (!term) return [];
		try {
			const conditions = fields.map((f) => `${f} ~ $term`).join(" OR ");
			const data = (await this.db.query(`SELECT * FROM ${table} WHERE ${conditions}`, { term }))?.[0] || [];
			return Array.isArray(data) ? data : [];
		} catch (e) {
			console.error(`DB Search Error [${table}]:`, e);
			return [];
		}
	}
	async query(sql, params) {
		try {
			return await this.db.query(sql, params);
		} catch (e) {
			console.error(`DB Raw Query Error:`, e);
			throw e;
		}
	}
};
//#endregion
//#region server/lib/db/dbFactory.ts
var _db = null;
var _adapter = null;
var _connecting = null;
async function createConnection() {
	const url = process.env.SURREAL_URL || "http://127.0.0.1:8000";
	const ns = process.env.SURREAL_NS || "test";
	const database = process.env.SURREAL_DB || "test";
	const user = process.env.SURREAL_USER || "root";
	const pass = process.env.SURREAL_PASS || "root";
	const db = new Surreal();
	try {
		await db.connect(url);
		if (user && pass) await db.signin({
			username: user,
			password: pass
		});
		await db.use({
			namespace: ns,
			database
		});
		_db = db;
		_adapter = new SurrealAdapter(db);
		console.log(`[DB] Connected to SurrealDB at ${url} (NS: ${ns}, DB: ${database})`);
		return {
			db: _db,
			adapter: _adapter
		};
	} catch (err) {
		_db = null;
		_adapter = null;
		_connecting = null;
		throw err;
	}
}
function getConnection() {
	if (_db && _adapter) return Promise.resolve({
		db: _db,
		adapter: _adapter
	});
	if (!_connecting) _connecting = createConnection().finally(() => {
		_connecting = null;
	});
	return _connecting;
}
async function getRawDb() {
	const { db } = await getConnection();
	return db;
}
async function getAdapter() {
	const { adapter } = await getConnection();
	return adapter;
}
function resetConnection() {
	_db = null;
	_adapter = null;
	_connecting = null;
}
//#endregion
//#region server/services/geminiService.ts
var apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) console.error("GEMINI_API_KEY is not defined. AI features will not work.");
var ai = new GoogleGenAI({ apiKey: apiKey || "dummy-key" });
var ensureConfigured = () => {
	if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server");
};
var parseJsonSafe = (raw, fallback) => {
	if (!raw) return fallback;
	try {
		return JSON.parse(raw);
	} catch {
		const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
		try {
			return JSON.parse(cleaned);
		} catch {
			return fallback;
		}
	}
};
var extractHashtags = (text) => {
	const matches = text.match(/#[a-z0-9_]+/gi) || [];
	return Array.from(new Set(matches.map((m) => m.toLowerCase()))).slice(0, 8);
};
var geminiService = {
	async rankJobs(jobs, query) {
		ensureConfigured();
		if (!query || jobs.length === 0) return jobs;
		try {
			const prompt = `Rank these job IDs based on resonance with the query: "${query}".
Context: ProSync Oman professional networking platform.
Return ONLY a JSON array of IDs.
Jobs: ${JSON.stringify(jobs.map((j) => ({
				id: j.id,
				title: j.title,
				description: j.description
			})))} `;
			return parseJsonSafe((await ai.models.generateContent({
				model: "gemini-3-flash-preview",
				contents: prompt,
				config: {
					responseMimeType: "application/json",
					responseSchema: {
						type: Type.ARRAY,
						items: { type: Type.INTEGER }
					}
				}
			})).text, []).map((id) => jobs.find((j) => j.id === id)).filter(Boolean);
		} catch (error) {
			console.error("AI ranking failed:", error);
			return jobs;
		}
	},
	async shortlistApplicants(jobDescription, applicants) {
		ensureConfigured();
		if (!jobDescription || applicants.length === 0) return applicants;
		try {
			const prompt = `Analyze these applicants for the job: "${jobDescription}".
Return a JSON array of objects with: applicantId, score (0-100), and reasoning.
Applicants: ${JSON.stringify(applicants.map((a) => ({
				id: a.user_id,
				name: a.full_name,
				headline: a.headline
			})))} `;
			return parseJsonSafe((await ai.models.generateContent({
				model: "gemini-3-flash-preview",
				contents: prompt,
				config: {
					responseMimeType: "application/json",
					responseSchema: {
						type: Type.ARRAY,
						items: {
							type: Type.OBJECT,
							properties: {
								applicantId: { type: Type.INTEGER },
								score: { type: Type.INTEGER },
								reasoning: { type: Type.STRING }
							},
							required: [
								"applicantId",
								"score",
								"reasoning"
							]
						}
					}
				}
			})).text, []);
		} catch (error) {
			console.error("AI shortlisting failed:", error);
			return null;
		}
	},
	async magicPost(content, instruction) {
		ensureConfigured();
		if (!content && !instruction) return null;
		try {
			const prompt = `You are a professional social media manager for ProSync Oman, a high-end networking platform.
Current Post Content: "${content || "(Empty)"}"
User Request/Instruction: "${instruction || "Optimize this post for professional engagement."}"

Instruction:
- If the user provided a request/instruction, follow it precisely to modify or generate the post content.
- If the current post content is provided and the instruction is general, rewrite the content to be more professional, punchy, and engaging.
- If only an instruction is provided (no content), write a full, engaging, and detailed post from scratch following that instruction.
- Focus on the Omani professional market.
- Use Markdown formatting (bold, bullet points, headers) to make the content well-structured and highly readable.
- Include relevant professional hashtags.
- Return JSON object: { optimizedContent, suggestedTags, quiz, poll }`;
			return parseJsonSafe((await ai.models.generateContent({
				model: "gemini-3-flash-preview",
				contents: prompt,
				config: {
					responseMimeType: "application/json",
					responseSchema: {
						type: Type.OBJECT,
						properties: {
							optimizedContent: { type: Type.STRING },
							suggestedTags: {
								type: Type.ARRAY,
								items: { type: Type.STRING }
							},
							quiz: {
								type: Type.OBJECT,
								properties: {
									question: { type: Type.STRING },
									options: {
										type: Type.ARRAY,
										items: { type: Type.STRING }
									},
									correctIndex: { type: Type.INTEGER }
								}
							},
							poll: {
								type: Type.OBJECT,
								properties: {
									question: { type: Type.STRING },
									options: {
										type: Type.ARRAY,
										items: { type: Type.STRING }
									}
								}
							}
						},
						required: ["optimizedContent", "suggestedTags"]
					}
				}
			})).text, null);
		} catch (error) {
			console.error("AI magic post failed:", error);
			return null;
		}
	},
	async *magicPostStream(content, instruction) {
		ensureConfigured();
		if (!content && !instruction) return;
		const prompt = `You are a professional social media manager for ProSync Oman, a high-end networking platform.
Current Post Content: "${content || "(Empty)"}"
User Request/Instruction: "${instruction || "Optimize this post for professional engagement."}"

Instruction:
- Return ONLY the final polished post text in markdown.
- Focus on the Omani professional market.
- Make it engaging, clear, and concise.
- Include relevant professional hashtags at the end.`;
		const response = await ai.models.generateContentStream({
			model: "gemini-3-flash-preview",
			contents: prompt
		});
		for await (const chunk of response) {
			const text = chunk.text || "";
			if (text) yield text;
		}
	},
	async generateInteractiveContent(topic, type) {
		ensureConfigured();
		if (!topic) return null;
		try {
			const prompt = `Generate a professional ${type} about "${topic}" for ProSync Oman. return JSON.`;
			return parseJsonSafe((await ai.models.generateContent({
				model: "gemini-3-flash-preview",
				contents: prompt,
				config: {
					responseMimeType: "application/json",
					responseSchema: type === "quiz" ? {
						type: Type.OBJECT,
						properties: {
							question: { type: Type.STRING },
							options: {
								type: Type.ARRAY,
								items: { type: Type.STRING }
							},
							correctIndex: { type: Type.INTEGER }
						},
						required: [
							"question",
							"options",
							"correctIndex"
						]
					} : {
						type: Type.OBJECT,
						properties: {
							question: { type: Type.STRING },
							options: {
								type: Type.ARRAY,
								items: { type: Type.STRING }
							}
						},
						required: ["question", "options"]
					}
				}
			})).text, null);
		} catch (error) {
			console.error("AI interactive content generation failed:", error);
			return null;
		}
	},
	buildMagicPostResultFromText(text) {
		return {
			optimizedContent: text,
			suggestedTags: extractHashtags(text),
			quiz: null,
			poll: null
		};
	}
};
//#endregion
//#region server/app.ts
var db;
var adapter;
var setupDone = false;
var toRecordId = (id, table) => {
	if (!id) return null;
	if (id instanceof _RecordId) return id;
	if (typeof id === "string") {
		if (id.includes(":")) {
			const [tb, val] = id.split(":");
			return new _RecordId(tb, val);
		} else if (table) return new _RecordId(table, id);
	}
	return id;
};
var stringId = (id) => {
	if (!id) return "";
	if (typeof id === "string") return id;
	return id.toString();
};
var normalizeUserId = (value) => {
	if (value === null || value === void 0) return null;
	const raw = String(value).trim();
	if (!raw) return null;
	return raw.includes(":") ? raw : `users:${raw}`;
};
var getAuthUserId = (req) => {
	const authHeader = req.headers["authorization"];
	if (!authHeader?.startsWith("Bearer ")) return null;
	return authHeader.slice(7).trim() || null;
};
var expandOptionalPath = (path) => {
	const match = path.match(/^(.*)\/:([A-Za-z0-9_]+)\?$/);
	if (!match) return [path];
	const base = match[1] || "";
	return [path.replace("?", ""), base || "/"];
};
var getCompatReq = async (c) => {
	if (c.__compatReq) return c.__compatReq;
	const url = new URL(c.req.url);
	const query = {};
	for (const [k, v] of url.searchParams.entries()) query[k] = v;
	const headersRaw = Object.fromEntries(c.req.raw.headers.entries());
	const headers = new Proxy(headersRaw, { get(target, prop) {
		return target[String(prop).toLowerCase()];
	} });
	let body = void 0;
	if (c.req.method !== "GET" && c.req.method !== "HEAD") {
		if ((headers["content-type"] || "").toLowerCase().includes("application/json")) try {
			body = await c.req.json();
		} catch {
			body = void 0;
		}
	}
	const compatReq = {
		query,
		body,
		headers,
		method: c.req.method,
		url: c.req.url,
		db: void 0,
		adapter: void 0
	};
	Object.defineProperty(compatReq, "params", {
		get() {
			return c.req.param();
		},
		enumerable: true,
		configurable: true
	});
	c.__compatReq = compatReq;
	return c.__compatReq;
};
var createCompatRes = (c) => {
	let statusCode = 200;
	const res = {
		__response: void 0,
		status(code) {
			statusCode = code;
			return res;
		},
		json(payload) {
			const response = c.json(payload, statusCode);
			res.__response = response;
			return response;
		},
		send(payload) {
			const response = typeof payload === "string" ? c.text(payload, statusCode) : c.json(payload, statusCode);
			res.__response = response;
			return response;
		}
	};
	return res;
};
var toHonoHandlers = (handlers, isMiddleware = false) => {
	return async (c, next) => {
		const req = await getCompatReq(c);
		const res = createCompatRes(c);
		let forwarded = false;
		const forward = async () => {
			if (forwarded) return;
			forwarded = true;
			return next();
		};
		const dispatch = async (index) => {
			const handler = handlers[index];
			if (!handler) {
				if (isMiddleware) return forward();
				return;
			}
			const out = await handler(req, res, async () => dispatch(index + 1));
			if (res.__response) return res.__response;
			if (out instanceof Response) return out;
			return out;
		};
		const maybe = await dispatch(0);
		if (res.__response) return res.__response;
		if (maybe instanceof Response) return maybe;
		if (isMiddleware && !forwarded) return forward();
		return c.json({ error: "No response generated" }, 500);
	};
};
var CompatRouter = class {
	hono = new Hono();
	use(handler) {
		if (typeof handler !== "function") return;
		if (handler.length === 4) return;
		this.hono.use("*", toHonoHandlers([handler], true));
	}
	get(path, ...handlers) {
		for (const p of expandOptionalPath(path)) this.hono.get(p, toHonoHandlers(handlers));
	}
	post(path, ...handlers) {
		for (const p of expandOptionalPath(path)) this.hono.post(p, toHonoHandlers(handlers));
	}
	put(path, ...handlers) {
		for (const p of expandOptionalPath(path)) this.hono.put(p, toHonoHandlers(handlers));
	}
	delete(path, ...handlers) {
		for (const p of expandOptionalPath(path)) this.hono.delete(p, toHonoHandlers(handlers));
	}
	all(path, ...handlers) {
		for (const p of expandOptionalPath(path)) this.hono.all(p, toHonoHandlers(handlers));
	}
	notFound(handler) {
		this.hono.notFound(async (c) => {
			const req = await getCompatReq(c);
			const res = createCompatRes(c);
			await handler(req, res);
			return res.__response || c.json({ error: "Not Found" }, 404);
		});
	}
	onError(handler) {
		this.hono.onError(async (err, c) => {
			const req = await getCompatReq(c);
			const res = createCompatRes(c);
			await handler(err, req, res, () => {});
			return res.__response || c.json({ error: err?.message || "Server Error" }, err?.status || 500);
		});
	}
};
async function initSchema() {
	try {
		await db.query(`
      DEFINE TABLE IF NOT EXISTS users SCHEMALESS;
      DEFINE INDEX IF NOT EXISTS userEmail ON users FIELDS email UNIQUE;
      DEFINE TABLE IF NOT EXISTS places SCHEMALESS;
      DEFINE INDEX IF NOT EXISTS placeName ON places FIELDS name UNIQUE;
      DEFINE TABLE IF NOT EXISTS posts SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS jobs SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS cv_sections SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS comments SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS messages SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS notifications SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS job_applications SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS connections SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS user_skills SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS portfolio SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS files SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS job_alerts SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS otps SCHEMALESS;
      DEFINE TABLE IF NOT EXISTS post_responses SCHEMALESS;
    `);
	} catch (e) {
		console.warn("Schema init skipped (may already exist):", e.message);
	}
}
var cities = [
	{
		id: "places:muscat",
		name: "Muscat",
		region: "Muscat"
	},
	{
		id: "places:salalah",
		name: "Salalah",
		region: "Dhofar"
	},
	{
		id: "places:sohar",
		name: "Sohar",
		region: "Al Batinah North"
	},
	{
		id: "places:nizwa",
		name: "Nizwa",
		region: "Al Dakhiliyah"
	},
	{
		id: "places:sur",
		name: "Sur",
		region: "Al Sharqiyah South"
	},
	{
		id: "places:ibri",
		name: "Ibri",
		region: "Al Dhahirah"
	},
	{
		id: "places:khasab",
		name: "Khasab",
		region: "Musandam"
	},
	{
		id: "places:rustaq",
		name: "Rustaq",
		region: "Al Batinah South"
	}
];
async function setupDatabase() {
	const [places] = await db.query("SELECT count() FROM places GROUP ALL");
	if ((places?.[0]?.count || 0) === 0) {
		console.log("Seeding places...");
		for (const city of cities) try {
			await db.query("UPSERT type::record($id) CONTENT $data", {
				id: city.id,
				data: {
					name: city.name,
					region: city.region
				}
			});
		} catch (e) {
			console.error(`Failed to seed city ${city.id}:`, e.message);
		}
	}
	const [adminCheck] = await db.query("SELECT count() as count FROM users WHERE role = \"admin\" GROUP ALL");
	const adminExists = (adminCheck?.[0]?.count || 0) > 0;
	console.log(`System Admin check: ${adminExists ? "FOUND" : "MISSING"}`);
	if (!adminExists) console.log("System waiting for initial setup via UI (Setup Node)...");
	else console.log("Database initialized with admin presence.");
	try {
		const [allUsers] = await db.query("SELECT email, role FROM users");
		console.log("Available users in DB:", allUsers?.map((u) => `${u.email} (${u.role})`).join(", ") || "NONE");
	} catch (e) {
		console.warn("Failed to list users during startup");
	}
}
var isAdmin = async (req, res, next) => {
	const userId = getAuthUserId(req);
	if (!userId) return res.status(401).json({ error: "Unauthorized" });
	try {
		const idRecord = userId.includes(":") ? userId : `users:${userId}`;
		const [users] = await db.query("SELECT * FROM type::record($userId)", { userId: idRecord });
		const user = users?.[0];
		if (!user) {
			console.warn(`Admin check failed: user ${idRecord} not found`);
			return res.status(401).json({ error: "Unauthorized" });
		}
		if (user.role !== "admin") {
			console.warn(`Admin access denied for user ${idRecord} (role: ${user.role})`);
			return res.status(403).json({ error: "Forbidden: Admin access required" });
		}
		next();
	} catch (e) {
		console.error("Admin check error:", e);
		return res.status(401).json({ error: "Unauthorized" });
	}
};
var seedDB = async (initialAdmin) => {
	console.log("Seeding database with fresh data...");
	try {
		await db.query(`
        DELETE posts; DELETE jobs; DELETE cv_sections; 
        DELETE job_applications; DELETE connections; DELETE notifications;
        DELETE user_skills; DELETE portfolio; DELETE files; DELETE job_alerts;
        DELETE post_responses; DELETE comments; DELETE messages;
      `);
		if (initialAdmin) await db.query("DELETE users");
		else await db.query("DELETE users WHERE role != \"admin\"");
	} catch (e) {
		console.warn("Cleanup before seed failed:", e.message);
	}
	const salt = bcryptjs_default.genSaltSync(10);
	const defaultHash = bcryptjs_default.hashSync("Password123!", salt);
	const usersSeed = [
		initialAdmin ? {
			id: "users:admin_root",
			email: initialAdmin.email,
			full_name: initialAdmin.full_name,
			password: initialAdmin.passwordHash,
			role: "admin",
			subscription: "enterprise",
			headline: "System Administrator",
			place_id: "places:muscat"
		} : {
			id: "users:admin",
			email: "admin@prosync.com",
			full_name: "System Admin",
			password: defaultHash,
			role: "admin",
			subscription: "enterprise",
			headline: "Platform Administration",
			place_id: "places:muscat"
		},
		{
			id: "users:ahmed",
			email: "ahmed@muscat.om",
			full_name: "Ahmed Al-Said",
			headline: "Senior Software Architect",
			bio: "Expert in cloud systems in Muscat.",
			role: "jobseeker",
			subscription: "pro",
			place_id: "places:muscat",
			is_company_rep: 0,
			password: defaultHash
		},
		{
			id: "users:recruiter",
			email: "recruiter@omantel.om",
			full_name: "Omantel HR",
			headline: "Talent Acquisition",
			bio: "Building the future of telecom in Oman.",
			role: "company",
			subscription: "enterprise",
			place_id: "places:muscat",
			is_company_rep: 1,
			password: defaultHash
		},
		{
			id: "users:fatima",
			email: "fatima@salalah.om",
			full_name: "Fatima Al-Balushi",
			headline: "UX Designer",
			bio: "Passionate about creating beautiful experiences.",
			role: "jobseeker",
			subscription: "free",
			place_id: "places:salalah",
			is_company_rep: 0,
			password: defaultHash
		},
		{
			id: "users:sohar_steel",
			email: "sohar_steel@industries.om",
			full_name: "Sohar Steel",
			headline: "Manufacturing Excellence",
			bio: "Leading industrial player in Sohar.",
			role: "company",
			subscription: "pro",
			place_id: "places:sohar",
			is_company_rep: 1,
			password: defaultHash
		},
		{
			id: "users:salim",
			email: "salim@omaninfra.com",
			full_name: "Salim Al-Harthy",
			headline: "Infrastructure Lead",
			bio: "Building Oman's digital bridge.",
			role: "company",
			subscription: "pro",
			place_id: "places:muscat",
			is_company_rep: 1,
			password: defaultHash
		}
	];
	for (const u of usersSeed) {
		const { id, place_id, ...rest } = u;
		try {
			await db.query("UPSERT type::record($id) CONTENT $data", {
				id,
				data: {
					...rest,
					place_id: toRecordId(place_id),
					created_at: (/* @__PURE__ */ new Date()).toISOString(),
					profile_views: 0,
					engagement: 0,
					connections_received: 0
				}
			});
		} catch (e) {
			console.error(`Failed to seed user ${id}:`, e.message);
		}
	}
	const jobSeed = [{
		user_id: toRecordId("users:recruiter"),
		title: "Cloud Infrastructure Engineer",
		company_name: "Omantel HR",
		place_id: toRecordId("places:muscat"),
		description: "Scale our nationwide network.",
		salary_range: "$2k - $4k",
		experience_level: "Senior",
		keywords: [
			"cloud",
			"networking",
			"telecom"
		]
	}, {
		user_id: toRecordId("users:sohar_steel"),
		title: "Mechanical Supervisor",
		company_name: "Sohar Steel",
		place_id: toRecordId("places:sohar"),
		description: "Manage production floor safety and efficiency.",
		salary_range: "$1.5k - $2.5k",
		experience_level: "Mid",
		keywords: [
			"mechanical",
			"safety",
			"industries"
		]
	}];
	for (const job of jobSeed) try {
		await db.query("CREATE jobs CONTENT $data", { data: {
			...job,
			created_at: (/* @__PURE__ */ new Date()).toISOString()
		} });
	} catch (e) {
		console.error("Failed to seed job:", e.message);
	}
	const postSeed = [{
		user_id: toRecordId("users:ahmed"),
		content: "Excited to see the tech growth in Muscat lately! #OmanTech",
		type: "standard",
		keywords: ["tech", "muscat"]
	}, {
		user_id: toRecordId("users:fatima"),
		content: "How important is cultural context in UI design for the Gulf region?",
		type: "discussion",
		keywords: ["design", "culture"]
	}];
	for (const post of postSeed) try {
		await db.query("CREATE posts CONTENT $data", { data: {
			...post,
			created_at: (/* @__PURE__ */ new Date()).toISOString()
		} });
	} catch (e) {
		console.error("Failed to seed post:", e.message);
	}
	console.log("Database seeding completed.");
};
var app = new Hono();
app.use("/api/*", async (c, next) => {
	console.log(`[API REQUEST] ${(/* @__PURE__ */ new Date()).toISOString()} - ${c.req.method} ${new URL(c.req.url).pathname}`);
	await next();
});
var apiRouter = new CompatRouter();
apiRouter.get("/health", (req, res) => res.json({ status: "ok" }));
apiRouter.use(async (req, res, next) => {
	try {
		adapter = await getAdapter();
		db = await getRawDb();
		req.db = db;
		req.adapter = adapter;
		if (!setupDone) {
			await initSchema();
			await setupDatabase();
			setupDone = true;
		}
	} catch (e) {
		resetConnection();
		console.error("DB connection failed:", e);
		return res.status(503).json({ error: "Database connection unavailable" });
	}
	await next();
});
apiRouter.get("/setup/status", async (req, res) => {
	try {
		const [users] = await db.query("SELECT count() as count FROM users WHERE role = \"admin\" GROUP ALL");
		const count = users?.[0]?.count || 0;
		res.json({ initialized: count > 0 });
	} catch (err) {
		res.json({ initialized: false });
	}
});
apiRouter.post("/setup/init", async (req, res) => {
	const { email, password, fullName, seed } = req.body;
	try {
		const [existing] = await db.query("SELECT count() as count FROM users WHERE role = \"admin\" GROUP ALL");
		if (existing?.[0]?.count > 0) return res.status(403).json({ error: "System already initialized. Setup is locked." });
		const salt = bcryptjs_default.genSaltSync(10);
		const hash = bcryptjs_default.hashSync(password, salt);
		if (seed) {
			console.log("Setup: Seeding database with custom admin credentials...");
			await seedDB({
				email,
				full_name: fullName,
				passwordHash: hash
			});
		} else {
			const adminId = `users:admin_${Date.now()}`;
			await db.query("CREATE type::record($id) CONTENT $data", {
				id: adminId,
				data: {
					email,
					full_name: fullName,
					role: "admin",
					password: hash,
					subscription: "enterprise",
					created_at: (/* @__PURE__ */ new Date()).toISOString(),
					avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`,
					headline: "System Administrator"
				}
			});
		}
		res.json({
			success: true,
			message: "System initialized successfully"
		});
	} catch (err) {
		console.error("Setup initialization error:", err);
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/admin/seed", isAdmin, async (req, res) => {
	try {
		await seedDB();
		res.json({
			success: true,
			message: "Database seeded successfully"
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.get("/auth/me", async (req, res) => {
	const userId = getAuthUserId(req);
	if (!userId) return res.status(401).json({ error: "Unauthorized" });
	try {
		const idRecord = userId.includes(":") ? userId : `users:${userId}`;
		const [users] = await db.query("SELECT * FROM type::record($userId)", { userId: idRecord });
		const user = users?.[0];
		if (!user) return res.status(404).json({ error: "User not found" });
		res.json({
			...user,
			id: stringId(user.id)
		});
	} catch (err) {
		res.status(401).json({ error: "Session invalid" });
	}
});
apiRouter.post("/admin/seed", isAdmin, async (req, res) => {
	try {
		await seedDB();
		res.json({
			success: true,
			message: "Database re-seeded successfully"
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.get("/admin/analytics", isAdmin, async (req, res) => {
	try {
		const [users] = await db.query("SELECT count() as count FROM users GROUP ALL");
		const [posts] = await db.query("SELECT count() as count FROM posts GROUP ALL");
		const [jobs] = await db.query("SELECT count() as count FROM jobs GROUP ALL");
		const [subs] = await db.query("SELECT subscription, count() as count FROM users GROUP BY subscription");
		const [roles] = await db.query("SELECT role, count() as count FROM users GROUP BY role");
		const stats = {
			users: users?.[0] || { count: 0 },
			posts: posts?.[0] || { count: 0 },
			jobs: jobs?.[0] || { count: 0 },
			subs: subs || [],
			roles: roles || []
		};
		res.json(stats);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.get("/admin/users", isAdmin, async (req, res) => {
	try {
		const [users] = await db.query("SELECT id, full_name, email, role, subscription FROM users");
		res.json((users || []).map((u) => ({
			...u,
			id: stringId(u.id)
		})));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/admin/update-subscription", isAdmin, async (req, res) => {
	const { userId, subscription } = req.body;
	try {
		await adapter.update("users", userId, { subscription });
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.get("/places", async (req, res) => {
	try {
		const places = await adapter.list("places");
		res.json(places.map((p) => ({
			...p,
			id: stringId(p.id)
		})));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/auth/check-email", async (req, res) => {
	const { email } = req.body;
	const [user] = await db.query("SELECT id FROM users WHERE email = $email", { email });
	res.json({ exists: !!user?.[0] });
});
apiRouter.post("/auth/login", async (req, res) => {
	const { email, password } = req.body;
	const [users] = await db.query("SELECT * FROM users WHERE email = $email", { email });
	const user = users?.[0];
	if (!user) return res.status(401).json({ error: "User not found" });
	if (!user.password) return res.status(401).json({ error: "This user has no password set. Please use Forgot Password." });
	if (!bcryptjs_default.compareSync(password, user.password)) return res.status(401).json({ error: "Invalid password" });
	const { password: _, ...userWithoutPassword } = user;
	res.json({
		...userWithoutPassword,
		id: stringId(user.id)
	});
});
apiRouter.post("/auth/register", async (req, res) => {
	const { email, password, full_name } = req.body;
	const [existing] = await db.query("SELECT id FROM users WHERE email = $email", { email });
	if (existing?.[0]) return res.status(400).json({ error: "Email already registered" });
	const salt = bcryptjs_default.genSaltSync(10);
	const hash = bcryptjs_default.hashSync(password, salt);
	try {
		const user = await adapter.insert("users", {
			email,
			full_name,
			password: hash,
			headline: "Professional Individual",
			subscription: "free",
			role: "jobseeker",
			created_at: (/* @__PURE__ */ new Date()).toISOString(),
			profile_views: 0,
			engagement: 0,
			connections_received: 0
		});
		const { password: _, ...userWithoutPassword } = user;
		res.json({
			...userWithoutPassword,
			id: stringId(user.id)
		});
	} catch (err) {
		console.error("Registration error:", err);
		res.status(500).json({ error: "Registration failed" });
	}
});
apiRouter.post("/auth/forgot-password", async (req, res) => {
	const { email } = req.body;
	const [user] = await db.query("SELECT id FROM users WHERE email = $email", { email });
	if (!user?.[0]) return res.status(404).json({ error: "No user found with this email" });
	const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
	const expiresAt = new Date(Date.now() + 600 * 1e3).toISOString();
	await db.query("DELETE FROM otps WHERE email = $email", { email });
	await db.query("CREATE otps CONTENT $data", { data: {
		email,
		otp,
		expires_at: expiresAt
	} });
	console.log(`[AUTH] OTP for ${email}: ${otp}`);
	res.json({
		success: true,
		message: "OTP sent to your email",
		debug_otp: otp
	});
});
apiRouter.post("/auth/verify-otp", async (req, res) => {
	const { email, otp } = req.body;
	const [records] = await db.query("SELECT * FROM otps WHERE email = $email AND otp = $otp", {
		email,
		otp
	});
	const record = records?.[0];
	if (!record) return res.status(401).json({ error: "Invalid OTP" });
	if (new Date(record.expires_at) < /* @__PURE__ */ new Date()) return res.status(401).json({ error: "OTP expired" });
	res.json({ success: true });
});
apiRouter.post("/auth/reset-password", async (req, res) => {
	const { email, otp, newPassword } = req.body;
	const [records] = await db.query("SELECT * FROM otps WHERE email = $email AND otp = $otp", {
		email,
		otp
	});
	const record = records?.[0];
	if (!record || new Date(record.expires_at) < /* @__PURE__ */ new Date()) return res.status(401).json({ error: "Invalid or expired OTP" });
	const salt = bcryptjs_default.genSaltSync(10);
	const hash = bcryptjs_default.hashSync(newPassword, salt);
	await db.query("UPDATE users SET password = $hash WHERE email = $email", {
		hash,
		email
	});
	await db.query("DELETE FROM otps WHERE email = $email", { email });
	res.json({
		success: true,
		message: "Password reset successfully"
	});
});
apiRouter.get("/notifications/:userId?", async (req, res) => {
	const userId = req.params.userId || getAuthUserId(req);
	if (!userId) return res.status(401).json({ error: "Unauthorized" });
	const idRecord = userId.includes(":") ? userId : `users:${userId}`;
	try {
		const [notifications] = await db.query("SELECT * FROM notifications WHERE user_id = type::record($userId) ORDER BY created_at DESC LIMIT 20", { userId: idRecord });
		res.json((notifications || []).map((n) => ({
			...n,
			id: stringId(n.id),
			user_id: stringId(n.user_id)
		})));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/notifications/read", async (req, res) => {
	const { notificationId } = req.body;
	await db.query("UPDATE type::record($id) MERGE $data", {
		id: notificationId,
		data: { is_read: 1 }
	});
	res.json({ success: true });
});
apiRouter.get("/connections/status/:userId/:targetId", async (req, res) => {
	try {
		const rawU = req.params.userId;
		const rawT = req.params.targetId;
		const userId = (() => {
			try {
				return decodeURIComponent(rawU);
			} catch {
				return rawU;
			}
		})();
		const targetId = (() => {
			try {
				return decodeURIComponent(rawT);
			} catch {
				return rawT;
			}
		})();
		const uId = userId.includes(":") ? userId : `users:${userId}`;
		const tId = targetId.includes(":") ? targetId : `users:${targetId}`;
		const [connection] = await db.query("SELECT id FROM connections WHERE user_id = type::record($uId) AND target_id = type::record($tId)", {
			uId,
			tId
		});
		res.json({ connected: !!connection?.[0] });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/connections", async (req, res) => {
	const { user_id, target_id } = req.body;
	const [existing] = await db.query("SELECT id FROM connections WHERE user_id = $userId AND target_id = $targetId", {
		userId: user_id,
		targetId: target_id
	});
	if (existing?.[0]) return res.json({
		success: true,
		message: "Already connected"
	});
	await adapter.insert("connections", {
		user_id: toRecordId(user_id),
		target_id: toRecordId(target_id),
		status: "accepted",
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	});
	await adapter.increment("users", target_id, "connections_received", 1);
	const [users] = await db.query("SELECT * FROM type::record($userId)", { userId: user_id });
	const user = users?.[0];
	await db.query("CREATE notifications CONTENT $data", { data: {
		user_id: toRecordId(target_id),
		type: "connection",
		title: "New Connection",
		content: `${user?.full_name || "Someone"} is now connected with you.`,
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	} });
	res.json({ success: true });
});
apiRouter.delete("/connections/:userId/:targetId", async (req, res) => {
	try {
		const rawU = req.params.userId;
		const rawT = req.params.targetId;
		const userId = (() => {
			try {
				return decodeURIComponent(rawU);
			} catch {
				return rawU;
			}
		})();
		const targetId = (() => {
			try {
				return decodeURIComponent(rawT);
			} catch {
				return rawT;
			}
		})();
		const uId = userId.includes(":") ? userId : `users:${userId}`;
		const tId = targetId.includes(":") ? targetId : `users:${targetId}`;
		await db.query("DELETE FROM connections WHERE user_id = type::record($uId) AND target_id = type::record($tId)", {
			uId,
			tId
		});
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.get("/topics", async (req, res) => {
	try {
		const [posts] = await db.query("SELECT content FROM posts WHERE content CONTAINS \"#\" LIMIT 100");
		const hashtags = {};
		posts?.forEach((p) => {
			p.content.match(/#[a-z0-9_]+/gi)?.forEach((tag) => {
				hashtags[tag] = (hashtags[tag] || 0) + 1;
			});
		});
		const sorted = Object.entries(hashtags).sort((a, b) => b[1] - a[1]).slice(0, 8).map((e) => e[0]);
		const result = sorted.length > 0 ? sorted : [
			"#FutureOman",
			"#TechSynapse",
			"#OmanVision2040",
			"#CareerScale",
			"#IndustrialOps"
		];
		res.json(result);
	} catch (err) {
		res.json([
			"#FutureOman",
			"#TechSynapse",
			"#OmanVision2040",
			"#CareerScale",
			"#IndustrialOps"
		]);
	}
});
apiRouter.get("/jobs", async (req, res) => {
	const { q, experience, minSalary, placeId } = req.query;
	try {
		let query = "SELECT *, place_id.name as place_name FROM jobs WHERE 1=1";
		const params = {};
		if (q) {
			query += " AND (title ~ $q OR description ~ $q OR company_name ~ $q)";
			params.q = q;
		}
		if (placeId && placeId !== "all") {
			const pId = placeId.includes(":") ? placeId : `places:${placeId}`;
			query += " AND place_id = type::record($placeId)";
			params.placeId = pId;
		}
		if (experience && experience !== "all") {
			query += " AND experience_level = $experience";
			params.experience = experience;
		}
		query += " ORDER BY created_at DESC";
		const [jobs] = await db.query(query, params);
		res.json((jobs || []).map((j) => ({
			...j,
			id: stringId(j.id),
			user_id: stringId(j.user_id),
			place_id: stringId(j.place_id)
		})));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/jobs", async (req, res) => {
	const { user_id, title, company_name, location, description, salary_range, experience_level, end_date } = req.body;
	const [users] = await db.query("SELECT * FROM type::record($userId)", { userId: user_id });
	const user = users?.[0];
	if (!user || user.is_company_rep !== 1 && user.role !== "company") return res.status(403).json({ error: "Only verified company representatives or company accounts can post jobs" });
	const [jobs] = await db.query("CREATE jobs CONTENT $data", { data: {
		user_id: toRecordId(user_id),
		title,
		company_name,
		location,
		description,
		salary_range,
		experience_level,
		end_date,
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	} });
	const job = jobs?.[0];
	await db.query("CREATE posts CONTENT $data", { data: {
		user_id: toRecordId(user_id),
		content: `We are hiring for: ${title} at ${company_name}. Location: ${location}.`,
		type: "standard",
		attachment_type: "job",
		attachment_id: toRecordId(job.id),
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	} });
	res.json({
		success: true,
		id: job.id
	});
});
apiRouter.get("/jobs/:jobId/applicants", async (req, res) => {
	const [applicants] = await db.query("SELECT *, user_id.* as user FROM job_applications WHERE job_id = type::record($jobId) ORDER BY created_at DESC", { jobId: req.params.jobId });
	const flattened = applicants?.map((ap) => ({
		...ap,
		id: stringId(ap.id),
		user_id: stringId(ap.user_id),
		job_id: stringId(ap.job_id),
		...ap.user,
		user: ap.user ? {
			...ap.user,
			id: stringId(ap.user.id)
		} : void 0
	})) || [];
	res.json(flattened);
});
apiRouter.post("/jobs/applications/status", async (req, res) => {
	await db.query("UPDATE type::record($id) MERGE $data", {
		id: req.body.applicationId,
		data: { status: req.body.status }
	});
	res.json({ success: true });
});
apiRouter.get("/search", async (req, res) => {
	const term = req.query.q;
	const type = req.query.type;
	const results = {
		posts: [],
		jobs: [],
		users: []
	};
	if (!type || type === "posts" || type === "all") {
		const posts = await adapter.search("posts", term, ["content", "keywords"]);
		results.posts = await Promise.all((posts || []).map(async (p) => {
			const user = await adapter.get("users", stringId(p.user_id));
			return {
				...p,
				id: stringId(p.id),
				user_id: stringId(p.user_id),
				user: user ? {
					...user,
					id: stringId(user.id)
				} : void 0
			};
		}));
	}
	if (!type || type === "jobs" || type === "all") {
		results.jobs = await adapter.search("jobs", term, [
			"title",
			"company_name",
			"description",
			"keywords"
		]);
		results.jobs = results.jobs.map((j) => ({
			...j,
			id: stringId(j.id),
			user_id: stringId(j.user_id)
		}));
	}
	if (!type || type === "users" || type === "all" || type === "companies") {
		let users = await adapter.search("users", term, [
			"full_name",
			"headline",
			"cv_text"
		]);
		if (type === "companies") users = users.filter((u) => u.role === "company");
		results.users = (users || []).map((u) => ({
			...u,
			id: stringId(u.id)
		}));
	}
	res.json(results);
});
apiRouter.post("/jobs/apply", async (req, res) => {
	const { user_id, job_id, attachment_type, attachment_id } = req.body;
	const [existing] = await db.query("SELECT id FROM job_applications WHERE user_id = $userId AND job_id = $jobId", {
		userId: user_id,
		jobId: job_id
	});
	if (existing?.[0]) return res.json({
		success: true,
		message: "Already applied"
	});
	await db.query("CREATE job_applications CONTENT $data", { data: {
		user_id: toRecordId(user_id),
		job_id: toRecordId(job_id),
		attachment_type: attachment_type || "none",
		attachment_id: toRecordId(attachment_id) || null,
		status: "pending",
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	} });
	res.json({ success: true });
});
apiRouter.get("/job-alerts/:userId", async (req, res) => {
	try {
		const rawId = req.params.userId;
		const userId = (() => {
			try {
				return decodeURIComponent(rawId);
			} catch {
				return rawId;
			}
		})();
		if (!userId) return res.status(400).json({ error: "Missing userId parameter" });
		const idRecord = userId.includes(":") ? userId : `users:${userId}`;
		const [alerts] = await db.query("SELECT * FROM job_alerts WHERE user_id = type::record($userId)", { userId: idRecord });
		res.json(alerts || []);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/job-alerts", async (req, res) => {
	const { user_id, ...rest } = req.body;
	await db.query("CREATE job_alerts CONTENT $data", { data: {
		...rest,
		user_id: toRecordId(user_id),
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	} });
	res.json({ success: true });
});
apiRouter.delete("/job-alerts/:alertId", async (req, res) => {
	await db.query("DELETE type::record($id)", { id: req.params.alertId });
	res.json({ success: true });
});
apiRouter.get("/messages/conversations/:userId", async (req, res) => {
	const rawId = req.params.userId;
	const userId = (() => {
		try {
			return decodeURIComponent(rawId);
		} catch {
			return rawId;
		}
	})();
	if (!userId) return res.status(400).json({ error: "Missing userId parameter" });
	try {
		const [messages] = await db.query(`
        SELECT sender_id, receiver_id FROM messages 
        WHERE sender_id = type::record($userId) OR receiver_id = type::record($userId)
      `, { userId: userId.includes(":") ? userId : `users:${userId}` });
		if (!messages) return res.json([]);
		const otherParticipantIds = /* @__PURE__ */ new Set();
		messages.forEach((p) => {
			const sId = String(p.sender_id);
			const rId = String(p.receiver_id);
			const currentUserId = userId.includes(":") ? userId : `users:${userId}`;
			if (sId !== currentUserId) otherParticipantIds.add(sId);
			if (rId !== currentUserId) otherParticipantIds.add(rId);
		});
		const conversations = [];
		for (const otherId of Array.from(otherParticipantIds)) {
			const [users] = await db.query("SELECT * FROM type::record($id)", { id: otherId });
			const user = users?.[0];
			if (!user) continue;
			const [lastMsgs] = await db.query("SELECT content, created_at FROM messages WHERE (sender_id = type::record($userId) AND receiver_id = type::record($otherId)) OR (sender_id = type::record($otherId) AND receiver_id = type::record($userId)) ORDER BY created_at DESC LIMIT 1", {
				userId: userId.includes(":") ? userId : `users:${userId}`,
				otherId
			});
			const lastMsg = lastMsgs?.[0];
			const [unreadRecords] = await db.query("SELECT count() FROM messages WHERE sender_id = type::record($otherId) AND receiver_id = type::record($userId) AND is_read = 0 GROUP ALL", {
				userId: userId.includes(":") ? userId : `users:${userId}`,
				otherId
			});
			conversations.push({
				id: stringId(user.id),
				full_name: user.full_name,
				avatar_url: user.avatar_url,
				headline: user.headline,
				last_message: lastMsg?.content,
				last_message_time: lastMsg?.created_at,
				unread_count: unreadRecords?.[0]?.count || 0
			});
		}
		const sorted = conversations.sort((a, b) => {
			const dateA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
			return (b.last_message_time ? new Date(b.last_message_time).getTime() : 0) - dateA;
		});
		res.json(sorted);
	} catch (err) {
		console.error("Conversations error:", err);
		res.status(500).json({ error: err.message });
	}
});
apiRouter.get("/messages/:userId/:targetId", async (req, res) => {
	try {
		const { userId, targetId } = req.params;
		const uId = userId.includes(":") ? userId : `users:${userId}`;
		const tId = targetId.includes(":") ? targetId : `users:${targetId}`;
		await db.query("UPDATE messages SET is_read = 1 WHERE sender_id = type::record($tId) AND receiver_id = type::record($uId)", {
			uId,
			tId
		});
		const [messages] = await db.query("SELECT * FROM messages WHERE (sender_id = type::record($uId) AND receiver_id = type::record($tId)) OR (sender_id = type::record($tId) AND receiver_id = type::record($uId)) ORDER BY created_at ASC", {
			uId,
			tId
		});
		res.json((messages || []).map((m) => ({
			...m,
			id: stringId(m.id),
			sender_id: stringId(m.sender_id),
			receiver_id: stringId(m.receiver_id)
		})));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/messages", async (req, res) => {
	const { sender_id, receiver_id, ...rest } = req.body;
	const [msgs] = await db.query("CREATE messages CONTENT $data", { data: {
		...rest,
		sender_id: toRecordId(sender_id),
		receiver_id: toRecordId(receiver_id),
		is_read: 0,
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	} });
	const msg = msgs?.[0];
	res.json({
		success: true,
		id: stringId(msg?.id)
	});
});
apiRouter.get("/content", async (req, res) => {
	const { type, userId, keyword } = req.query;
	let query = "SELECT * FROM posts";
	const params = {};
	const conditions = [];
	if (type) {
		conditions.push("type = $type");
		params.type = type;
	}
	if (userId) {
		conditions.push("user_id = type::record($userId)");
		params.userId = userId;
	}
	if (keyword) {
		conditions.push("content ~ $keyword");
		params.keyword = keyword;
	}
	if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
	query += " ORDER BY created_at DESC";
	try {
		const [rows] = await db.query(query, params);
		const posts = rows || [];
		const results = await Promise.all(posts.map(async (p) => {
			const postId = stringId(p.id);
			const postUserId = stringId(p.user_id);
			const postRecordId = postId.includes(":") ? postId : `posts:${postId}`;
			const [users] = await db.query("SELECT * FROM type::record($id)", { id: postUserId });
			const postUser = users?.[0];
			const [commentCounts] = await db.query("SELECT count() as count FROM comments WHERE post_id = type::record($postId) GROUP ALL", { postId: postRecordId });
			const commentCount = commentCounts?.[0]?.count || 0;
			const [postStats] = await db.query("SELECT count() as count, response_index FROM post_responses WHERE post_id = type::record($postId) GROUP BY response_index", { postId: postRecordId });
			const formattedStats = (postStats || []).map((s) => `${s.response_index}:${s.count}`).join(",");
			return {
				...p,
				id: postId,
				user_id: postUserId,
				user: postUser ? {
					...postUser,
					id: stringId(postUser.id)
				} : void 0,
				comment_count: commentCount,
				response_stats: formattedStats
			};
		}));
		res.json(results);
	} catch (err) {
		console.error("Content fetch error:", err);
		res.status(500).json({ error: err.message });
	}
});
apiRouter.get("/profile/:userId", async (req, res) => {
	const rawUserId = req.params.userId;
	const { viewerId } = req.query;
	if (!rawUserId) return res.status(400).json({ error: "Missing userId parameter" });
	const idRecord = normalizeUserId((() => {
		try {
			return decodeURIComponent(rawUserId);
		} catch {
			return rawUserId;
		}
	})());
	if (!idRecord) return res.status(400).json({ error: "Invalid userId parameter" });
	try {
		const normalizedViewerId = normalizeUserId((() => {
			try {
				return viewerId ? decodeURIComponent(String(viewerId)) : viewerId;
			} catch {
				return viewerId;
			}
		})());
		if (normalizedViewerId && normalizedViewerId !== idRecord) {
			const [metricsRows] = await db.query("SELECT profile_views, engagement FROM type::record($id)", { id: idRecord });
			const metrics = metricsRows?.[0] || {};
			const profileViews = Number(metrics.profile_views || 0);
			const engagement = Number(metrics.engagement || 0);
			await db.query("UPDATE type::record($id) MERGE $data", {
				id: idRecord,
				data: {
					profile_views: profileViews + 1,
					engagement: engagement + 1
				}
			});
		}
		const [users] = await db.query("SELECT *, place_id.name as place_name FROM type::record($id)", { id: idRecord });
		const user = users?.[0];
		if (!user) return res.status(404).json({ error: "User not found" });
		const [cv] = await db.query("SELECT * FROM cv_sections WHERE user_id = type::record($userId) ORDER BY start_date DESC", { userId: idRecord });
		const [skills] = await db.query("SELECT * FROM user_skills WHERE user_id = type::record($userId)", { userId: idRecord });
		const [portfolio] = await db.query("SELECT * FROM portfolio WHERE user_id = type::record($userId)", { userId: idRecord });
		const [jobs] = user.is_company_rep || user.role === "company" ? await db.query("SELECT * FROM jobs WHERE user_id = type::record($userId) ORDER BY created_at DESC", { userId: idRecord }) : [[]];
		const { password: _pw, ...userWithoutPassword } = user;
		const result = {
			...userWithoutPassword,
			id: stringId(user.id),
			place_id: stringId(user.place_id),
			analytics: {
				profile_views: user.profile_views || 0,
				connections_received: user.connections_received || 0,
				engagement: user.engagement || 0
			},
			cv: (cv || []).map((c) => ({
				...c,
				id: stringId(c.id)
			})),
			skills: (skills || []).map((s) => ({
				...s,
				id: stringId(s.id)
			})),
			portfolio: (portfolio || []).map((p) => ({
				...p,
				id: stringId(p.id)
			})),
			jobs: (jobs || []).map((j) => ({
				...j,
				id: stringId(j.id)
			}))
		};
		res.json(result);
	} catch (err) {
		console.error(`Profile fetch error for ${idRecord}:`, err);
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/cv", async (req, res) => {
	const { user_id, ...rest } = req.body;
	try {
		const section = await adapter.insert("cv_sections", {
			...rest,
			user_id: toRecordId(user_id, "users"),
			created_at: (/* @__PURE__ */ new Date()).toISOString()
		});
		await adapter.insert("posts", {
			user_id: toRecordId(user_id, "users"),
			content: `Updated CV: Added ${req.body.type} - ${req.body.title} at ${req.body.subtitle}`,
			type: "cv_update",
			attachment_type: "cv_item",
			attachment_id: section.id,
			created_at: (/* @__PURE__ */ new Date()).toISOString()
		});
		res.json({
			success: true,
			id: stringId(section.id)
		});
	} catch (err) {
		console.error("CV update error:", err);
		res.status(500).json({ error: err.message });
	}
});
apiRouter.put("/profile", async (req, res) => {
	const { user_id, headline, bio, avatar_url, company_name, company_description, company_website } = req.body;
	const idRecord = user_id.includes(":") ? user_id : `users:${user_id}`;
	try {
		await db.query("UPDATE type::record($id) MERGE $data", {
			id: idRecord,
			data: {
				headline,
				bio,
				avatar_url,
				company_name,
				company_description,
				company_website
			}
		});
		res.json({ success: true });
	} catch (err) {
		console.error(`Profile update failure for ${user_id}:`, err);
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/skills", async (req, res) => {
	const { user_id, name, proficiency, verification_url } = req.body;
	const [userSkill] = await db.query("SELECT id FROM user_skills WHERE user_id = type::record($user_id) AND name = $name", {
		user_id,
		name
	});
	if (userSkill?.[0]) await db.query("UPDATE type::record($id) MERGE $data", {
		id: userSkill[0].id,
		data: {
			proficiency,
			verification_url,
			is_verified: verification_url ? 1 : 0
		}
	});
	else await db.query("CREATE user_skills CONTENT $data", { data: {
		user_id: toRecordId(user_id),
		name,
		proficiency,
		verification_url,
		is_verified: verification_url ? 1 : 0
	} });
	res.json({ success: true });
});
apiRouter.post("/skills/verify", async (req, res) => {
	const { user_id, name, verification_url } = req.body;
	if (!user_id) return res.status(400).json({ error: "Missing user_id" });
	const idRecord = user_id.includes(":") ? user_id : `users:${user_id}`;
	const [userSkill] = await db.query("SELECT id FROM user_skills WHERE user_id = type::record($user_id) AND name = $name", {
		user_id: idRecord,
		name
	});
	if (userSkill?.[0]) await db.query("UPDATE type::record($id) MERGE $data", {
		id: userSkill[0].id,
		data: {
			verification_url,
			is_verified: 1
		}
	});
	else await db.query("CREATE user_skills CONTENT $data", { data: {
		user_id,
		name,
		verification_url,
		is_verified: 1
	} });
	res.json({ success: true });
});
apiRouter.post("/portfolio", async (req, res) => {
	const { user_id, title, description, url, thumbnail_url } = req.body;
	if (!user_id) return res.status(400).json({ error: "Missing user_id" });
	try {
		const item = await adapter.insert("portfolio", {
			user_id: toRecordId(user_id, "users"),
			title,
			description,
			url,
			thumbnail_url: thumbnail_url || null,
			created_at: (/* @__PURE__ */ new Date()).toISOString()
		});
		res.json({
			success: true,
			id: stringId(item.id)
		});
	} catch (err) {
		console.error("Portfolio creation error:", err);
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/posts", async (req, res) => {
	const { user_id, ...rest } = req.body;
	console.log(`[DB] Creating post for user: ${user_id}`, rest);
	try {
		const post = await adapter.insert("posts", {
			...rest,
			user_id: toRecordId(user_id),
			created_at: (/* @__PURE__ */ new Date()).toISOString()
		});
		console.log(`[DB] Post created successfully:`, post.id);
		res.json({
			success: true,
			id: stringId(post?.id),
			post
		});
	} catch (err) {
		console.error("Post creation error:", err);
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/posts/:postId/respond", async (req, res) => {
	const { postId } = req.params;
	const { user_id, type, response_index } = req.body;
	try {
		const existing = await adapter.list("post_responses", {
			filter: "post_id = type::record($postId) AND user_id = type::record($userId)",
			params: {
				postId,
				userId: user_id
			}
		});
		if (existing.length > 0) await adapter.update("post_responses", stringId(existing[0].id), { response_index });
		else await adapter.insert("post_responses", {
			post_id: toRecordId(postId, "posts"),
			user_id: toRecordId(user_id, "users"),
			type,
			response_index,
			created_at: (/* @__PURE__ */ new Date()).toISOString()
		});
		res.json({ success: true });
	} catch (err) {
		console.error("Post response error:", err);
		res.status(500).json({ error: err.message });
	}
});
apiRouter.get("/posts/:postId/comments", async (req, res) => {
	try {
		const [results] = await db.query("SELECT *, user_id.* as user FROM comments WHERE post_id = $postId ORDER BY created_at ASC", { postId: req.params.postId });
		const mapped = (results || []).map((c) => ({
			...c,
			id: stringId(c.id),
			user_id: stringId(c.user?.id || c.user_id),
			full_name: c.user?.full_name,
			avatar_url: c.user?.avatar_url
		}));
		res.json(mapped);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/comments", async (req, res) => {
	const { user_id, post_id, ...rest } = req.body;
	try {
		await adapter.insert("comments", {
			...rest,
			user_id: toRecordId(user_id, "users"),
			post_id: toRecordId(post_id, "posts"),
			created_at: (/* @__PURE__ */ new Date()).toISOString()
		});
		res.json({ success: true });
	} catch (err) {
		console.error("Comment creation error:", err);
		res.status(500).json({ error: err.message });
	}
});
apiRouter.get("/candidates", async (req, res) => {
	const { skills } = req.query;
	try {
		let query = "SELECT *, (SELECT VALUE name FROM user_skills WHERE user_id = $parent.id) as skill_list FROM users WHERE role = \"jobseeker\"";
		const params = {};
		if (skills) {
			query += " AND (SELECT count() FROM user_skills WHERE user_id = $parent.id AND name IN $skillArr)[0].count > 0";
			params.skillArr = skills.split(",").map((s) => s.trim());
		}
		const results = ((await adapter.query(query, params))?.[0] || []).map((u) => ({
			...u,
			id: stringId(u.id)
		}));
		res.json(results);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.get("/recommendations/:userId?", async (req, res) => {
	const userId = req.params.userId;
	try {
		const idRecord = userId && userId !== "undefined" ? userId.includes(":") ? userId : `users:${userId}` : null;
		let query = "SELECT id, full_name, headline, avatar_url, role FROM users WHERE role != \"admin\"";
		const params = {};
		if (idRecord) {
			query += " AND id != type::record($userId)";
			params.userId = idRecord;
		}
		query += " LIMIT 6";
		const [recs] = await db.query(query, params);
		res.json((recs || []).map((r) => ({
			...r,
			id: stringId(r.id)
		})));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.get("/files/:userId", async (req, res) => {
	const rawId = req.params.userId;
	const userId = (() => {
		try {
			return decodeURIComponent(rawId);
		} catch {
			return rawId;
		}
	})();
	const { purpose } = req.query;
	const idRecord = userId.includes(":") ? userId : `users:${userId}`;
	try {
		let query = "SELECT * FROM files WHERE user_id = type::record($userId)";
		const params = { userId: idRecord };
		if (purpose) {
			query += " AND purpose = $purpose";
			params.purpose = purpose;
		}
		query += " ORDER BY created_at DESC";
		const [files] = await db.query(query, params);
		res.json(files || []);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/files", async (req, res) => {
	const { user_id, ...rest } = req.body;
	const [files] = await db.query("CREATE files CONTENT $data", { data: {
		...rest,
		user_id: toRecordId(user_id),
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	} });
	const file = files?.[0];
	res.json({
		success: true,
		id: stringId(file?.id)
	});
});
apiRouter.delete("/files/:fileId", async (req, res) => {
	await db.query("DELETE type::record($id)", { id: req.params.fileId });
	res.json({ success: true });
});
apiRouter.post("/ai/rank-jobs", async (req, res) => {
	try {
		const { jobs, query } = req.body || {};
		if (!Array.isArray(jobs)) return res.status(400).json({ error: "jobs must be an array" });
		const ranked = await geminiService.rankJobs(jobs, String(query || ""));
		res.json({ ranked });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/ai/shortlist-applicants", async (req, res) => {
	try {
		const { jobDescription, applicants } = req.body || {};
		if (!Array.isArray(applicants)) return res.status(400).json({ error: "applicants must be an array" });
		const feedback = await geminiService.shortlistApplicants(String(jobDescription || ""), applicants);
		res.json({ feedback: feedback || [] });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/ai/interactive", async (req, res) => {
	try {
		const { topic, type } = req.body || {};
		if (type !== "quiz" && type !== "poll") return res.status(400).json({ error: "type must be quiz or poll" });
		const result = await geminiService.generateInteractiveContent(String(topic || ""), type);
		res.json({ result });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/ai/magic-post", async (req, res) => {
	try {
		const { content, instruction } = req.body || {};
		const result = await geminiService.magicPost(String(content || ""), instruction ? String(instruction) : void 0);
		res.json({ result });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/ai/magic-post/stream", async (req, res) => {
	try {
		const { content, instruction } = req.body || {};
		const encoder = new TextEncoder();
		let fullText = "";
		const stream = new ReadableStream({ start: async (controller) => {
			const send = (event, payload) => {
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
			};
			try {
				for await (const chunk of geminiService.magicPostStream(String(content || ""), instruction ? String(instruction) : void 0)) {
					fullText += chunk;
					send("chunk", {
						text: chunk,
						fullText
					});
				}
				send("done", { result: geminiService.buildMagicPostResultFromText(fullText) });
			} catch (error) {
				send("error", { message: error.message });
			} finally {
				controller.close();
			}
		} });
		return new Response(stream, { headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive"
		} });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/user/preference/place", async (req, res) => {
	const { user_id, place_id } = req.body;
	await db.query("UPDATE type::record($userId) MERGE $data", {
		userId: user_id,
		data: { place_id: place_id === "all" ? null : place_id }
	});
	res.json({ success: true });
});
apiRouter.delete("/posts/:postId", async (req, res) => {
	const { postId } = req.params;
	const userId = getAuthUserId(req);
	if (!userId) return res.status(401).json({ error: "Auth required" });
	try {
		const [post] = await db.query("SELECT user_id FROM type::record($id)", { id: postId.includes(":") ? postId : `posts:${postId}` });
		if (!post?.[0]) return res.status(404).json({ error: "Post not found" });
		const [admin] = await db.query("SELECT role FROM type::record($id)", { id: userId.toString().includes(":") ? userId : `users:${userId}` });
		const isAdmin = admin?.[0]?.role === "admin";
		if (stringId(post[0].user_id) !== stringId(userId) && !isAdmin) return res.status(403).json({ error: "Unauthorized to delete this post" });
		await db.query("DELETE type::record($id)", { id: postId.includes(":") ? postId : `posts:${postId}` });
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.put("/posts/:postId", async (req, res) => {
	const { postId } = req.params;
	const { content } = req.body;
	const userId = getAuthUserId(req);
	if (!userId) return res.status(401).json({ error: "Auth required" });
	try {
		const [post] = await db.query("SELECT user_id FROM type::record($id)", { id: postId.includes(":") ? postId : `posts:${postId}` });
		if (!post?.[0]) return res.status(404).json({ error: "Post not found" });
		if (stringId(post[0].user_id) !== stringId(userId)) return res.status(403).json({ error: "Unauthorized to edit this post" });
		await db.query("UPDATE type::record($id) SET content = $content", {
			id: postId.includes(":") ? postId : `posts:${postId}`,
			content
		});
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
apiRouter.post("/admin/seed-jobs", async (req, res) => {
	const userId = getAuthUserId(req);
	if (!userId) return res.status(401).json({ error: "Auth required" });
	try {
		const [user] = await db.query("SELECT role FROM type::record($id)", { id: userId.toString().includes(":") ? userId : `users:${userId}` });
		if (user?.[0]?.role !== "admin") return res.status(403).json({ error: "Admin only" });
		const [companies] = await db.query("SELECT id, company_name FROM users WHERE role = \"company\" LIMIT 5");
		if (!companies || companies.length === 0) return res.status(400).json({ error: "No company accounts found to assign jobs to. Create some company accounts first." });
		const seedJobs = [
			{
				title: "Senior Software Engineer",
				location: "Muscat, Oman",
				salary: "$5,000 - $8,000",
				experience: "5+ years"
			},
			{
				title: "Project Manager",
				location: "Salalah, Oman",
				salary: "$4,000 - $6,000",
				experience: "3+ years"
			},
			{
				title: "Marketing Specialist",
				location: "Dubai, UAE",
				salary: "$3,500 - $5,000",
				experience: "2+ years"
			},
			{
				title: "UX/UI Designer",
				location: "Remote",
				salary: "$4,500 - $7,000",
				experience: "4+ years"
			},
			{
				title: "Data Scientist",
				location: "Muscat, Oman",
				salary: "$6,000 - $9,000",
				experience: "3+ years"
			}
		];
		for (const job of seedJobs) {
			const company = companies[Math.floor(Math.random() * companies.length)];
			await db.query("CREATE jobs SET user_id = $userId, title = $title, company_name = $company, location = $location, description = \"Join our team in this exciting role!\", salary_range = $salary, experience_level = $exp, end_date = time::now() + 30d, created_at = time::now()", {
				userId: company.id,
				title: job.title,
				company: company.company_name || "Innovate Oman",
				location: job.location,
				salary: job.salary,
				exp: job.experience
			});
		}
		res.json({
			success: true,
			count: seedJobs.length
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
app.route("/api", apiRouter.hono);
apiRouter.notFound((req, res) => {
	res.status(404).json({ error: `Not Found: ${req.method} ${req.url}` });
});
apiRouter.onError((err, req, res, next) => {
	console.error("API Error:", err);
	res.status(err.status || 500).json({ error: err.message || "Server Error" });
});
app.all("/api/*", (c) => {
	return c.json({ error: `Not Found: ${c.req.method} ${new URL(c.req.url).pathname}` }, 404);
});
//#endregion
//#region server.ts
var server_default = app;
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var multiHandler = (...handlers) => {
	const final = handlers.pop();
	const middleware = handlers.filter(Boolean).map((h) => toMiddleware(h));
	return (ev) => callMiddleware(ev, middleware, final);
};
var _lazy_5RB4Ma = defineLazyEventHandler(() => import("./_routes/api/router.mjs"));
var _lazy_zx37Kk = defineLazyEventHandler(() => import("./_chunks/renderer-template.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const $0 = {
		route: "/api/router",
		handler: _lazy_5RB4Ma
	}, $1 = {
		route: "/**",
		handler: multiHandler(toEventHandler(server_default), _lazy_zx37Kk)
	};
	return (m, p) => {
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		if (p === "/api/router") return { data: $0 };
		let s = p.split("/");
		s.length;
		return {
			data: $1,
			params: { "_": s.slice(1).join("/") }
		};
	};
})();
[].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function createNitroApp() {
	const hooks = void 0;
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		{
			const routeRules = getRouteRules(method, pathname);
			event.context.routeRules = routeRules?.routeRules;
			if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		}
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
//#endregion
export { cloudflare_module_default as default };
