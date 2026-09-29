const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API Routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });

    it('should filter tasks by status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });
      
      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Task 1');
    });

    it('should return paginated tasks correctly', async () => {
      for (let i = 0; i < 5; i++) {
        taskService.create({ title: `Task ${i + 1}` });
      }

      // Asking for page 1, limit 2
      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    it('should allow combining status and pagination', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });
      taskService.create({ title: 'Task 3', status: 'todo' });
      
      const res = await request(app).get('/tasks?status=todo&page=1&limit=1');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return task statistics', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.overdue).toBe(0);
    });
  });

  describe('POST /tasks', () => {
    it('should create a new task', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task', priority: 'high' });
      
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New Task');
      expect(res.body.priority).toBe('high');
      expect(res.body.id).toBeDefined();
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ priority: 'high' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task', async () => {
      const task = taskService.create({ title: 'Old Task' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Task', status: 'in_progress' });
      
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Task');
      expect(res.body.status).toBe('in_progress');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent')
        .send({ title: 'Updated Task' });
      
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid update data', async () => {
      const task = taskService.create({ title: 'Old Task' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'invalid' });
      
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete an existing task', async () => {
      const task = taskService.create({ title: 'Task to delete' });
      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      
      const found = taskService.findById(task.id);
      expect(found).toBeUndefined();
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark a task as complete', async () => {
      const task = taskService.create({ title: 'Task to complete' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).not.toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent/complete');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task to a user', async () => {
      const task = taskService.create({ title: 'Task to assign' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Bob' });
      
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent/assign')
        .send({ assignee: 'Bob' });
      
      expect(res.status).toBe(404);
    });

    it('should return 400 for missing assignee', async () => {
      const task = taskService.create({ title: 'Task to assign' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for empty assignee', async () => {
      const task = taskService.create({ title: 'Task to assign' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
