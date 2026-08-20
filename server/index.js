require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const allowedOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

function normalizeOrigin(value) {
  if (!value) return ''
  return value.toLowerCase().replace(/\/$/, '')
}

const exactAllowedOrigins = new Set(
  allowedOrigins
    .filter((o) => !o.includes('*'))
    .map((o) => normalizeOrigin(o)),
)

const wildcardAllowedOrigins = allowedOrigins
  .filter((o) => o.includes('*'))
  .map((o) => normalizeOrigin(o))

function wildcardOriginToRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`)
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) return true;

  const normalizedOrigin = normalizeOrigin(origin)
  if (exactAllowedOrigins.has(normalizedOrigin)) return true

  for (const pattern of wildcardAllowedOrigins) {
    // Supports patterns like https://*.vercel.app
    const regex = wildcardOriginToRegex(pattern)
    if (regex.test(normalizedOrigin)) return true
  }

  return false
}

app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server and non-browser clients with no origin header
    if (isOriginAllowed(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
}));
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB = process.env.MONGO_DB || 'app_notas';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

let client, db;
let Users, Notes, TimeEntries;

async function start() {
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(MONGO_DB);
  Users = db.collection('users');
  Notes = db.collection('notes');
  TimeEntries = db.collection('time_entries');
  await Users.createIndex({ username: 1 }, { unique: true }).catch(()=>{});
  await Notes.createIndex({ user_id: 1 }).catch(()=>{});
  await TimeEntries.createIndex({ user_id: 1 }).catch(()=>{});

  app.listen(PORT, HOST, () => console.log(`Server listening on ${HOST}:${PORT}`));
}

function toPublic(doc) {
  if (!doc) return null;
  const out = { ...doc };
  if (out._id) { out.id = out._id.toString(); delete out._id; }
  return out;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const m = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const d = new Date(timeStr);
  if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
  return null;
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
  const token = h.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id.toString(), username: payload.username };
    return next();
  } catch (err) { return res.status(401).json({ error: 'invalid token' }); }
}

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Auth
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const now = new Date().toISOString();
    const hash = await bcrypt.hash(password, 10);
    const result = await Users.insertOne({ username, password_hash: hash, created_at: now });
    const user = await Users.findOne({ _id: result.insertedId }, { projection: { password_hash: 0 } });
    const token = jwt.sign({ id: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: toPublic(user), token });
  } catch (err) {
    if (err && err.code === 11000) return res.status(400).json({ error: 'username already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const user = await Users.findOne({ username });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ id: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id.toString(), username: user.username } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Notes CRUD
app.get('/notes', requireAuth, async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.toString().trim() : '';
    const page = parseInt(req.query.page || '1', 10) || 1;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10) || 10));
    const offset = (page - 1) * limit;
    const filter = { user_id: req.user.id };
    if (q) filter.$or = [{ title: { $regex: q, $options: 'i' } }, { content: { $regex: q, $options: 'i' } }];
    const dateFrom = req.query.date_from ? req.query.date_from.toString().trim() : null;
    const dateTo = req.query.date_to ? req.query.date_to.toString().trim() : null;
    if (dateFrom || dateTo) {
      filter.created_at = {};
      if (dateFrom) filter.created_at.$gte = dateFrom + 'T00:00:00';
      if (dateTo) filter.created_at.$lte = dateTo + 'T23:59:59';
    }
    const total = await Notes.countDocuments(filter);
    const rows = await Notes.find(filter).sort({ created_at: -1 }).skip(offset).limit(limit).toArray();
    res.json({ items: rows.map(toPublic), total, page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/notes/:id', requireAuth, async (req, res) => {
  try {
    const _id = ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null;
    if (!_id) return res.status(404).json({ error: 'Not found' });
    const row = await Notes.findOne({ _id, user_id: req.user.id });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(toPublic(row));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/notes', requireAuth, async (req, res) => {
  try {
    const { title = '', content = '' } = req.body;
    if (!title || !title.toString().trim()) return res.status(400).json({ error: 'title is required' });
    const now = new Date().toISOString();
    const doc = { title, content, created_at: now, updated_at: now, user_id: req.user.id };
    const result = await Notes.insertOne(doc);
    const note = await Notes.findOne({ _id: result.insertedId });
    res.status(201).json(toPublic(note));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/notes/:id', requireAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !title.toString().trim()) return res.status(400).json({ error: 'title is required' });
    const _id = ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null;
    if (!_id) return res.status(404).json({ error: 'Not found' });
    const now = new Date().toISOString();
    await Notes.updateOne({ _id, user_id: req.user.id }, { $set: { title, content, updated_at: now } });
    const note = await Notes.findOne({ _id, user_id: req.user.id });
    res.json(toPublic(note));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/notes/:id', requireAuth, async (req, res) => {
  try {
    const _id = ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null;
    if (!_id) return res.status(404).json({ error: 'Not found' });
    await Notes.deleteOne({ _id, user_id: req.user.id });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Time entries
app.get('/time-entries', requireAuth, async (req, res) => {
  try {
    const { month } = req.query; // format YYYY-MM
    const filter = { user_id: req.user.id };
    if (month) filter.date = { $regex: `^${month}` };
    const rows = await TimeEntries.find(filter).sort({ date: -1 }).toArray();
    res.json(rows.map(toPublic));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/time-entries', requireAuth, async (req, res) => {
  try {
    const { date, start_time, end_time, notes = '', shift = 'morning', overtime_weekend_minutes = 0, overtime_holiday_minutes = 0 } = req.body;
    if (!date || !start_time || !end_time) return res.status(400).json({ error: 'date, start_time and end_time are required' });
    const allowedShifts = ['morning','afternoon','night'];
    const shiftVal = (shift || '').toString().trim().toLowerCase();
    const shiftFinal = allowedShifts.includes(shiftVal) ? shiftVal : 'morning';
    const startMin = parseTimeToMinutes(start_time);
    const endMin = parseTimeToMinutes(end_time);
    if (startMin === null || endMin === null) return res.status(400).json({ error: 'invalid time format' });
    if (endMin <= startMin) return res.status(400).json({ error: 'end_time must be after start_time' });
    const duration = Math.max(0, endMin - startMin);
    const owWeekend = parseInt(overtime_weekend_minutes || 0, 10) || 0;
    const owHoliday = parseInt(overtime_holiday_minutes || 0, 10) || 0;
    const now = new Date().toISOString();
    const doc = { date, start_time, end_time, duration_minutes: duration, notes, shift: shiftFinal, overtime_weekend_minutes: owWeekend, overtime_holiday_minutes: owHoliday, created_at: now, user_id: req.user.id };
    const result = await TimeEntries.insertOne(doc);
    const entry = await TimeEntries.findOne({ _id: result.insertedId });
    res.status(201).json(toPublic(entry));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/time-entries/overtime', requireAuth, async (req, res) => {
  try {
    const { date, notes = '', overtime_weekend_minutes = 0, overtime_holiday_minutes = 0 } = req.body;
    const parseHours = value => {
      const normalized = String(value || '').replace(',', '.').trim()
      const parsed = parseFloat(normalized)
      return isNaN(parsed) ? 0 : Math.round(parsed * 60)
    }
    const owWeekend = parseHours(overtime_weekend_minutes)
    const owHoliday = parseHours(overtime_holiday_minutes)
    if (owWeekend <= 0 && owHoliday <= 0) return res.status(400).json({ error: 'Se requiere al menos una hora extra' });
    const entryDate = date && date.toString().trim() ? date.toString().trim() : new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const doc = {
      date: entryDate,
      start_time: '',
      end_time: '',
      duration_minutes: 0,
      notes,
      shift: 'extra',
      overtime_weekend_minutes: owWeekend,
      overtime_holiday_minutes: owHoliday,
      created_at: now,
      user_id: req.user.id
    };
    const result = await TimeEntries.insertOne(doc);
    const entry = await TimeEntries.findOne({ _id: result.insertedId });
    res.status(201).json(toPublic(entry));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/time-entries/:id', requireAuth, async (req, res) => {
  try {
    const { date, start_time, end_time, notes, shift = 'morning', overtime_weekend_minutes = 0, overtime_holiday_minutes = 0 } = req.body;
    if (!date || !start_time || !end_time) return res.status(400).json({ error: 'date, start_time and end_time are required' });
    const allowedShifts = ['morning','afternoon','night'];
    const shiftVal = (shift || '').toString().trim().toLowerCase();
    const shiftFinal = allowedShifts.includes(shiftVal) ? shiftVal : 'morning';
    const startMin = parseTimeToMinutes(start_time);
    const endMin = parseTimeToMinutes(end_time);
    if (startMin === null || endMin === null) return res.status(400).json({ error: 'invalid time format' });
    if (endMin <= startMin) return res.status(400).json({ error: 'end_time must be after start_time' });
    const duration = Math.max(0, endMin - startMin);
    const owWeekend = parseInt(overtime_weekend_minutes || 0, 10) || 0;
    const owHoliday = parseInt(overtime_holiday_minutes || 0, 10) || 0;
    const _id = ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null;
    if (!_id) return res.status(400).json({ error: 'invalid id' });
    await TimeEntries.updateOne({ _id, user_id: req.user.id }, { $set: { date, start_time, end_time, duration_minutes: duration, notes, shift: shiftFinal, overtime_weekend_minutes: owWeekend, overtime_holiday_minutes: owHoliday } });
    const entry = await TimeEntries.findOne({ _id, user_id: req.user.id });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(toPublic(entry));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/time-entries/:id', requireAuth, async (req, res) => {
  try {
    const _id = ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null;
    if (!_id) return res.status(400).json({ error: 'invalid id' });
    await TimeEntries.deleteOne({ _id, user_id: req.user.id });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reports
app.get('/reports/hours', requireAuth, async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month) return res.status(400).json({ error: 'month query required (YYYY-MM)' });
    const match = { user_id: req.user.id, date: { $regex: `^${month}` } };
    const agg = await TimeEntries.aggregate([
      { $match: match },
      { $group: { _id: null, total_minutes: { $sum: '$duration_minutes' }, overtime_weekend_minutes: { $sum: '$overtime_weekend_minutes' }, overtime_holiday_minutes: { $sum: '$overtime_holiday_minutes' } } }
    ]).toArray();
    const row = agg[0] || { total_minutes: 0, overtime_weekend_minutes: 0, overtime_holiday_minutes: 0 };
    const totalMinutes = row.total_minutes || 0;
    const owWeekend = row.overtime_weekend_minutes || 0;
    const owHoliday = row.overtime_holiday_minutes || 0;
    const totalWithOvertime = totalMinutes + owWeekend + owHoliday;
    res.json({ month, total_hours: +(totalMinutes / 60).toFixed(2), total_minutes: totalMinutes, overtime_weekend_hours: +(owWeekend / 60).toFixed(2), overtime_holiday_hours: +(owHoliday / 60).toFixed(2), total_with_overtime_hours: +(totalWithOvertime / 60).toFixed(2) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

start().catch(err => { console.error('Failed to start server:', err); process.exit(1); });
