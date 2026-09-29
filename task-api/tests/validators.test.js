const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../src/utils/validators');

describe('Validators', () => {
  describe('validateCreateTask', () => {
    it('should return null for valid task data', () => {
      const validTask = { title: 'Test Task', status: 'todo', priority: 'high' };
      expect(validateCreateTask(validTask)).toBeNull();
    });

    it('should return error if title is missing', () => {
      expect(validateCreateTask({ status: 'todo' })).toMatch(/title is required/);
    });

    it('should return error if title is empty string', () => {
      expect(validateCreateTask({ title: '   ' })).toMatch(/title is required/);
    });

    it('should return error if status is invalid', () => {
      expect(validateCreateTask({ title: 'Task', status: 'invalid_status' })).toMatch(/status must be one of/);
    });

    it('should return error if priority is invalid', () => {
      expect(validateCreateTask({ title: 'Task', priority: 'critical' })).toMatch(/priority must be one of/);
    });

    it('should return error if dueDate is invalid', () => {
      expect(validateCreateTask({ title: 'Task', dueDate: 'not-a-date' })).toMatch(/dueDate must be a valid ISO date string/);
    });

    it('should return error if dueDate is an empty string', () => {
      // Empty string is not a valid ISO date string or null
      expect(validateCreateTask({ title: 'Task', dueDate: '' })).toMatch(/dueDate must be a valid ISO date string/);
    });
    
    it('should allow valid dueDate', () => {
      expect(validateCreateTask({ title: 'Task', dueDate: new Date().toISOString() })).toBeNull();
    });
  });

  describe('validateUpdateTask', () => {
    it('should return null for valid update data', () => {
      const validUpdate = { title: 'Updated Task', status: 'done', priority: 'low' };
      expect(validateUpdateTask(validUpdate)).toBeNull();
    });

    it('should allow partial updates', () => {
      expect(validateUpdateTask({ status: 'in_progress' })).toBeNull();
      expect(validateUpdateTask({ priority: 'medium' })).toBeNull();
    });

    it('should return error if title is provided but empty', () => {
      expect(validateUpdateTask({ title: '   ' })).toMatch(/title must be a non-empty string/);
    });

    it('should return error if status is invalid', () => {
      expect(validateUpdateTask({ status: 'invalid_status' })).toMatch(/status must be one of/);
    });

    it('should return error if priority is invalid', () => {
      expect(validateUpdateTask({ priority: 'critical' })).toMatch(/priority must be one of/);
    });

    it('should return error if dueDate is invalid', () => {
      expect(validateUpdateTask({ dueDate: 'not-a-date' })).toMatch(/dueDate must be a valid ISO date string/);
    });

    it('should return error if dueDate is an empty string', () => {
      expect(validateUpdateTask({ dueDate: '' })).toMatch(/dueDate must be a valid ISO date string/);
    });
  });

  describe('validateAssignTask', () => {
    it('should return null for valid assignee', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
    });

    it('should return error if assignee is missing', () => {
      expect(validateAssignTask({})).toMatch(/assignee is required/);
    });

    it('should return error if assignee is an empty string', () => {
      expect(validateAssignTask({ assignee: '   ' })).toMatch(/assignee is required/);
    });

    it('should return error if assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 123 })).toMatch(/assignee is required/);
    });
  });
});
