import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { app, setCollectionsForTests } = require('../index.js');

class FakeUsersCollection {
  constructor() {
    this.rows = [];
    this.seq = 1;
  }

  async createIndex() {}

  async insertOne(doc) {
    const exists = this.rows.find(r => r.username === doc.username);
    if (exists) {
      const err = new Error('duplicate key');
      err.code = 11000;
      throw err;
    }
    const insertedId = String(this.seq++);
    this.rows.push({ ...doc, _id: insertedId });
    return { insertedId };
  }

  async findOne(query, options = {}) {
    let row = null;
    if (query && query._id) {
      row = this.rows.find(r => String(r._id) === String(query._id)) || null;
    } else if (query && query.username) {
      row = this.rows.find(r => r.username === query.username) || null;
    }

    if (!row) return null;

    if (options.projection && options.projection.password_hash === 0) {
      const copy = { ...row };
      delete copy.password_hash;
      return copy;
    }

    return { ...row };
  }
}

describe('API auth and health', () => {
  let users;

  beforeEach(() => {
    users = new FakeUsersCollection();
    setCollectionsForTests({ users, notes: {}, timeEntries: {} });
  });

  it('GET /health responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe('notas-backend');
  });

  it('POST /auth/register crea usuario y token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'ana', password: '123456' });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.username).toBe('ana');
    expect(res.body.user.id).toBeDefined();
    expect(res.body.token).toBeTypeOf('string');
  });

  it('POST /auth/register devuelve 400 si usuario ya existe', async () => {
    await request(app)
      .post('/auth/register')
      .send({ username: 'ana', password: '123456' });

    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'ana', password: 'abcdef' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('username already exists');
  });

  it('POST /auth/login autentica usuario valido', async () => {
    const hash = await bcrypt.hash('123456', 10);
    await users.insertOne({ username: 'juan', password_hash: hash, created_at: new Date().toISOString() });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'juan', password: '123456' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.username).toBe('juan');
    expect(res.body.token).toBeTypeOf('string');
  });

  it('POST /auth/login falla con credenciales invalidas', async () => {
    const hash = await bcrypt.hash('123456', 10);
    await users.insertOne({ username: 'juan', password_hash: hash, created_at: new Date().toISOString() });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'juan', password: 'wrong' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('invalid credentials');
  });
});
