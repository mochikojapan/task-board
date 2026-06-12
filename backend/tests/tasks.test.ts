import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { setupTestApp, auth } from './helpers.js';

describe('tasks API', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    ({ app, token } = await setupTestApp());
  });

  it('creates a task (201) and validates required fields (400)', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', auth(token))
      .send({ title: 'Write tests', priority: 'high', status: 'todo' });

    expect(created.status).toBe(201);
    expect(created.body.id).toBeTypeOf('number');
    expect(created.body.title).toBe('Write tests');
    expect(created.body.status).toBe('todo');

    const invalid = await request(app)
      .post('/api/tasks')
      .set('Authorization', auth(token))
      .send({ description: 'missing a title' });

    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists tasks with pagination and status filter', async () => {
    // Seed a few tasks across statuses.
    await request(app).post('/api/tasks').set('Authorization', auth(token)).send({ title: 'A', status: 'todo' });
    await request(app).post('/api/tasks').set('Authorization', auth(token)).send({ title: 'B', status: 'done' });
    await request(app).post('/api/tasks').set('Authorization', auth(token)).send({ title: 'C', status: 'done' });

    const page = await request(app)
      .get('/api/tasks?page=1&limit=2')
      .set('Authorization', auth(token));

    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(2);
    expect(page.body.pagination.limit).toBe(2);
    expect(page.body.pagination.total).toBeGreaterThanOrEqual(3);

    const done = await request(app)
      .get('/api/tasks?status=done')
      .set('Authorization', auth(token));

    expect(done.status).toBe(200);
    expect(done.body.data.every((t: { status: string }) => t.status === 'done')).toBe(true);
  });

  it('updates a task with PATCH', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', auth(token))
      .send({ title: 'Draft', status: 'todo' });

    const id = created.body.id;
    const updated = await request(app)
      .patch(`/api/tasks/${id}`)
      .set('Authorization', auth(token))
      .send({ status: 'in_progress', priority: 'low' });

    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe('in_progress');
    expect(updated.body.priority).toBe('low');
    expect(updated.body.updatedAt).not.toBe(created.body.updatedAt);
  });

  it('deletes a task and returns 404 afterwards', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', auth(token))
      .send({ title: 'Temporary' });

    const id = created.body.id;
    const del = await request(app)
      .delete(`/api/tasks/${id}`)
      .set('Authorization', auth(token));
    expect(del.status).toBe(204);

    const after = await request(app)
      .get(`/api/tasks/${id}`)
      .set('Authorization', auth(token));
    expect(after.status).toBe(404);
    expect(after.body.error.code).toBe('NOT_FOUND');
  });

  it('returns stats with status counts and overdue total', async () => {
    // An overdue, unfinished task.
    await request(app)
      .post('/api/tasks')
      .set('Authorization', auth(token))
      .send({ title: 'Overdue thing', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });

    const res = await request(app).get('/api/stats').set('Authorization', auth(token));

    expect(res.status).toBe(200);
    expect(res.body.byStatus).toHaveProperty('todo');
    expect(res.body.byStatus).toHaveProperty('in_progress');
    expect(res.body.byStatus).toHaveProperty('done');
    expect(res.body.overdue).toBeGreaterThanOrEqual(1);
  });
});
