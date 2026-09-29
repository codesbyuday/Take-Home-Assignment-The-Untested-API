const taskService = require('../src/services/taskService');

describe('Task Service', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('should create a task with default values', () => {
      const task = taskService.create({ title: 'Test task' });
      expect(task).toMatchObject({
        title: 'Test task',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        completedAt: null
      });
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find a task by id', () => {
      const task = taskService.create({ title: 'Task 1' });
      const found = taskService.findById(task.id);
      expect(found).toEqual(task);
    });

    it('should return undefined if task not found', () => {
      expect(taskService.findById('non-existent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      const tasks = taskService.getAll();
      expect(tasks.length).toBe(2);
    });
  });

  describe('getByStatus', () => {
    it('should return tasks with the exact status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });
      
      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks.length).toBe(1);
      expect(todoTasks[0].title).toBe('Task 1');
    });

    it('should not return tasks with partially matching status strings', () => {
      taskService.create({ title: 'Task 1', status: 'done' });
      const tasks = taskService.getByStatus('do'); 
      // If the bug exists where 'includes' is used, this test will fail, 
      // because we expect it to return 0 items for 'do' if there are only 'done' tasks.
      expect(tasks.length).toBe(0); 
    });
  });

  describe('getPaginated', () => {
    it('should return the correct first page (page 1)', () => {
      for (let i = 0; i < 5; i++) {
        taskService.create({ title: `Task ${i+1}` });
      }
      // Assuming page 1 is the first page
      const page = taskService.getPaginated(1, 2);
      expect(page.length).toBe(2);
      expect(page[0].title).toBe('Task 1');
      expect(page[1].title).toBe('Task 2');
    });

    it('should return correct subsequent pages', () => {
      for (let i = 0; i < 5; i++) {
        taskService.create({ title: `Task ${i+1}` });
      }
      const page = taskService.getPaginated(2, 2);
      expect(page.length).toBe(2);
      expect(page[0].title).toBe('Task 3');
      expect(page[1].title).toBe('Task 4');
    });
  });

  describe('getStats', () => {
    it('should return correctly calculated stats', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate.toISOString() });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done', dueDate: pastDate.toISOString() });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1); // Task 1 is overdue, Task 3 is done so shouldn't count as overdue
    });
  });

  describe('update', () => {
    it('should update task fields', () => {
      const task = taskService.create({ title: 'Task 1' });
      const updated = taskService.update(task.id, { title: 'Updated Title', status: 'done' });
      
      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe('done');
      
      const found = taskService.findById(task.id);
      expect(found.title).toBe('Updated Title');
    });

    it('should not allow overwriting the id or createdAt fields', () => {
      const task = taskService.create({ title: 'Task 1' });
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, { id: 'hacked-id', createdAt: '1999-01-01' });
      
      expect(updated.id).toBe(originalId);
      expect(updated.createdAt).toBe(originalCreatedAt);
    });

    it('should return null for non-existent task', () => {
      expect(taskService.update('non-existent', { title: 'Update' })).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove a task by id', () => {
      const task = taskService.create({ title: 'Task 1' });
      const result = taskService.remove(task.id);
      expect(result).toBe(true);
      expect(taskService.getAll().length).toBe(0);
    });

    it('should return false for non-existent task', () => {
      expect(taskService.remove('non-existent')).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should mark a task as complete and set completedAt', () => {
      const task = taskService.create({ title: 'Task 1' });
      const completed = taskService.completeTask(task.id);
      
      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
    });

    it('should not overwrite the task priority', () => {
      const task = taskService.create({ title: 'Task 1', priority: 'high' });
      const completed = taskService.completeTask(task.id);
      
      // If the bug exists where priority is hardcoded to 'medium', this will fail.
      expect(completed.priority).toBe('high');
    });

    it('should return null for non-existent task', () => {
      expect(taskService.completeTask('non-existent')).toBeNull();
    });
  });

  describe('assignTask', () => {
    it('should assign a task to a user', () => {
      const task = taskService.create({ title: 'Task to assign' });
      const assigned = taskService.assignTask(task.id, 'Alice');
      
      expect(assigned.assignee).toBe('Alice');
    });

    it('should return null for non-existent task', () => {
      expect(taskService.assignTask('non-existent', 'Alice')).toBeNull();
    });

    it('should allow reassigning a task', () => {
      const task = taskService.create({ title: 'Task' });
      taskService.assignTask(task.id, 'Alice');
      const reassigned = taskService.assignTask(task.id, 'Bob');
      
      expect(reassigned.assignee).toBe('Bob');
    });
  });
});
