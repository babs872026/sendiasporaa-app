import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { FakeCollection } from './helpers/fakeDb.js';

const require = createRequire(import.meta.url);
const { app, setCollectionsForTests } = require('../index.js');

const token = jwt.sign({ id: 'user-1', username: 'tester' }, process.env.JWT_SECRET || 'dev_secret_change_me', { expiresIn: '7d' });

function auth() {
  return { Authorization: `Bearer ${token}` };
}

describe('API notes', () => {
  let notes;

  beforeEach(() => {
    notes = new FakeCollection();
    setCollectionsForTests({ users: new FakeCollection(), notes, timeEntries: new FakeCollection() });
  });

  it('POST /notes crea una nota', async () => {
    const res = await request(app)
      .post('/notes')
      .set(auth())
      .send({ title: 'Primera nota', content: 'contenido' });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Primera nota');
    expect(res.body.id).toBeDefined();
  });

  it('GET /notes lista solo notas del usuario autenticado', async () => {
    await notes.insertOne({ title: 'A', content: 'x', created_at: '2026-09-01T10:00:00', updated_at: '2026-09-01T10:00:00', user_id: 'user-1' });
    await notes.insertOne({ title: 'B', content: 'y', created_at: '2026-09-01T11:00:00', updated_at: '2026-09-01T11:00:00', user_id: 'user-2' });

    const res = await request(app)
      .get('/notes?page=1&limit=10')
      .set(auth());

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('A');
  });

  it('PUT /notes/:id actualiza la nota', async () => {
    const created = await request(app)
      .post('/notes')
      .set(auth())
      .send({ title: 'Antes', content: 'texto' });

    const res = await request(app)
      .put(`/notes/${created.body.id}`)
      .set(auth())
      .send({ title: 'Despues', content: 'actualizado' });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Despues');
    expect(res.body.content).toBe('actualizado');
  });

  it('DELETE /notes/:id elimina la nota', async () => {
    const created = await request(app)
      .post('/notes')
      .set(auth())
      .send({ title: 'Temporal', content: 'borrar' });

    const del = await request(app)
      .delete(`/notes/${created.body.id}`)
      .set(auth());

    const list = await request(app)
      .get('/notes?page=1&limit=10')
      .set(auth());

    expect(del.statusCode).toBe(204);
    expect(list.body.total).toBe(0);
  });

  it('POST /notes falla sin titulo', async () => {
    const res = await request(app)
      .post('/notes')
      .set(auth())
      .send({ title: '   ', content: 'x' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('title is required');
  });
});
