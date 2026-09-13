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

describe('API time entries', () => {
  let timeEntries;

  beforeEach(() => {
    timeEntries = new FakeCollection();
    setCollectionsForTests({ users: new FakeCollection(), notes: new FakeCollection(), timeEntries });
  });

  it('POST /time-entries crea registro horario valido', async () => {
    const res = await request(app)
      .post('/time-entries')
      .set(auth())
      .send({ date: '2026-09-10', start_time: '09:00', end_time: '17:00', shift: 'morning' });

    expect(res.statusCode).toBe(201);
    expect(res.body.duration_minutes).toBe(480);
    expect(res.body.shift).toBe('morning');
  });

  it('POST /time-entries valida end_time mayor que start_time', async () => {
    const res = await request(app)
      .post('/time-entries')
      .set(auth())
      .send({ date: '2026-09-10', start_time: '17:00', end_time: '09:00', shift: 'morning' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('end_time must be after start_time');
  });

  it('GET /time-entries filtra por month', async () => {
    await timeEntries.insertOne({
      user_id: 'user-1',
      date: '2026-09-01',
      start_time: '09:00',
      end_time: '17:00',
      duration_minutes: 480,
      shift: 'morning',
      overtime_weekend_minutes: 0,
      overtime_holiday_minutes: 0,
      created_at: '2026-09-01T00:00:00.000Z'
    });
    await timeEntries.insertOne({
      user_id: 'user-1',
      date: '2026-08-31',
      start_time: '09:00',
      end_time: '17:00',
      duration_minutes: 480,
      shift: 'morning',
      overtime_weekend_minutes: 0,
      overtime_holiday_minutes: 0,
      created_at: '2026-08-31T00:00:00.000Z'
    });

    const res = await request(app)
      .get('/time-entries?month=2026-09')
      .set(auth());

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].date).toBe('2026-09-01');
  });

  it('POST /time-entries/overtime crea registro de horas extra', async () => {
    const res = await request(app)
      .post('/time-entries/overtime')
      .set(auth())
      .send({ date: '2026-09-12', overtime_weekend_minutes: 1.5, overtime_holiday_minutes: 0.5 });

    expect(res.statusCode).toBe(201);
    expect(res.body.shift).toBe('extra');
    expect(res.body.overtime_weekend_minutes).toBe(90);
    expect(res.body.overtime_holiday_minutes).toBe(30);
  });

  it('DELETE /time-entries/:id elimina registro', async () => {
    const created = await request(app)
      .post('/time-entries')
      .set(auth())
      .send({ date: '2026-09-10', start_time: '09:00', end_time: '17:00', shift: 'morning' });

    const del = await request(app)
      .delete(`/time-entries/${created.body.id}`)
      .set(auth());

    const list = await request(app)
      .get('/time-entries')
      .set(auth());

    expect(del.statusCode).toBe(204);
    expect(list.body).toHaveLength(0);
  });
});
