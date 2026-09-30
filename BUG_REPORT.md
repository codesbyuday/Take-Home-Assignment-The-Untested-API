# Bug Report

## Bug 1: Partial String Matching in Status Filter

### Location / Endpoint
`src/services/taskService.js` -> `getByStatus` function
`GET /tasks?status=...` endpoint

### Expected Behavior
The status filter should only return tasks that exactly match the requested status string.

### Actual Behavior
The service uses `.includes(status)` instead of exact string matching. For example, filtering by `do` will match both `done` and `todo`. 

### How It Was Discovered
A unit test in `taskService.test.js` created tasks with the status `done`. Calling `taskService.getByStatus('do')` unexpectedly returned the `done` tasks instead of returning an empty array.

### Root Cause
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

### What a Fix Would Look Like
Change the filter to use strict equality:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```
### Status
Fixed

---

## Bug 2: Incorrect Pagination Offset Calculation

### Location / Endpoint
`src/services/taskService.js` -> `getPaginated` function
`GET /tasks?page=1&limit=10` endpoint

### Expected Behavior
Requesting page 1 should return the first batch of results (items 0 through `limit - 1`).

### Actual Behavior
The offset is calculated as `page * limit`. For `page=1` and `limit=2`, the offset is `2`, which skips the first two items and effectively returns the second page instead of the first.

### How It Was Discovered
A unit test generated 5 tasks and requested `page=1` and `limit=2`. It expected to receive Task 1 and Task 2, but received Task 3 and Task 4 instead.

### Root Cause
```javascript
const getPaginated = (page, limit) => {
  const offset = page * limit;
  return tasks.slice(offset, offset + limit);
};
```

### What a Fix Would Look Like
Adjust the calculation to treat page 1 as the first page:
```javascript
const offset = (page > 0 ? page - 1 : 0) * limit;
```
### Status
Fixed

---

## Bug 3: Cannot Combine Status Filtering and Pagination

### Location / Endpoint
`src/routes/tasks.js` -> `GET /tasks` endpoint

### Expected Behavior
Requesting `GET /tasks?status=todo&page=1&limit=10` should return a paginated list of tasks that have the `todo` status.

### Actual Behavior
The routing logic checks if `status` is provided and returns early with the unfiltered list of tasks matching the status, completely ignoring the `page` and `limit` query parameters.

### How It Was Discovered
An integration test requested `?status=todo&page=1&limit=1` expecting 1 item back, but it received all `todo` items because pagination was skipped.

### Root Cause
```javascript
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks); // Returns early!
  }
```

### What a Fix Would Look Like
Modify the logic (or the service method) to apply the status filter first, and then paginate the filtered result, returning the combined array.
### Status
Fixed

---

## Bug 4: Completing a Task Resets its Priority

### Location / Endpoint
`src/services/taskService.js` -> `completeTask` function
`PATCH /tasks/:id/complete` endpoint

### Expected Behavior
Marking a task as complete should only update its `status` to `done` and set the `completedAt` timestamp. Other properties should remain unchanged.

### Actual Behavior
The function hardcodes `priority: 'medium'` into the updated task, accidentally overwriting the task's existing priority.

### How It Was Discovered
A test created a task with a `high` priority and then called `completeTask`. Afterwards, the task's priority had unexpectedly changed to `medium`.

### Root Cause
```javascript
  const updated = {
    ...task,
    priority: 'medium', // Unnecessary and destructive overwrite
    status: 'done',
    completedAt: new Date().toISOString(),
  };
```

### What a Fix Would Look Like
Remove the `priority: 'medium'` line from the `updated` object in `completeTask`.
### Status
Fixed

---

## Bug 5: Update Endpoint Allows Overwriting System-Managed Fields

### Location / Endpoint
`src/services/taskService.js` -> `update` function
`PUT /tasks/:id` endpoint

### Expected Behavior
Clients should not be able to change internal, system-managed fields such as `id` or `createdAt`.

### Actual Behavior
The `update` function blindly merges the incoming `fields` object with the existing task. If a client includes an `id` or `createdAt` field in the body, it will overwrite the existing internal values.

### How It Was Discovered
A test explicitly passed `{ id: 'hacked-id', createdAt: '1999-01-01' }` to the `taskService.update()` function and successfully changed the task's ID and creation timestamp.

### Root Cause
```javascript
  const updated = { ...tasks[index], ...fields };
```

### What a Fix Would Look Like
Filter out protected fields before merging, for example:
```javascript
const { id: _, createdAt: __, ...safeFields } = fields;
const updated = { ...tasks[index], ...safeFields };
```
### Status
Fixed

---

## Bug 6: Empty Strings Bypass `dueDate` Validation

### Location / Endpoint
`src/utils/validators.js` -> `validateCreateTask` and `validateUpdateTask`
`POST /tasks` and `PUT /tasks/:id` endpoints

### Expected Behavior
A `dueDate` should be either omitted, `null`, or a valid ISO string. Passing an empty string `""` should trigger a validation error.

### Actual Behavior
The validation uses a logical AND (`body.dueDate && ...`), which short-circuits if the value is falsy. An empty string evaluates to false, so the invalid date string validation is entirely skipped and the empty string is accepted.

### How It Was Discovered
A validation unit test checked if `{ dueDate: "" }` would throw an error. It did not, and returned `null` (success) instead.

### Root Cause
```javascript
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
```

### What a Fix Would Look Like
Explicitly ensure the value is defined and not null before parsing:
```javascript
  if (body.dueDate !== undefined && body.dueDate !== null) {
    if (body.dueDate === '' || isNaN(Date.parse(body.dueDate))) {
      return 'dueDate must be a valid ISO date string';
    }
  }
```
### Status
Fixed

---

## Observations / Questions

### 1. Inconsistent Status Names in Documentation
The `README.md` claims the available statuses are `pending | in-progress | completed`.
However, `ASSIGNMENT.md` and the actual codebase (in `validators.js`) use `todo | in_progress | done`. This inconsistency should be updated in the README.

### 2. PUT vs PATCH
The API defines `PUT /tasks/:id` for updating a task. A `PUT` request generally implies a full replacement of the resource, but the current `validateUpdateTask` and `update` logic allows partial updates (fields can be omitted). This behaves more like a `PATCH`. A question for the team would be whether we should enforce full-replacement for `PUT` or rename the endpoint to `PATCH`.
