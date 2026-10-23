import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';
import { Task, TaskStatus, TaskPriority } from '../../domain/entities/task.entity.js';
import { NotFoundError, ValidationError } from '../../domain/errors.js';
import { generateId } from '../utils.js';

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

export class TaskService {
  constructor(private readonly taskRepo: TaskRepository) {}

  getAll(userId: string): Task[] {
    return this.taskRepo.getAll(userId);
  }

  getById(id: string, userId: string): Task | undefined {
    return this.taskRepo.findById(id, userId);
  }

  create(data: Partial<Task>, userId: string): Task {
    if (!data.title || !data.title.trim()) throw new ValidationError('title es obligatorio');
    if (data.status && !STATUSES.includes(data.status)) throw new ValidationError(`status inválido: ${data.status}`);
    if (data.priority && !PRIORITIES.includes(data.priority)) throw new ValidationError(`priority inválida: ${data.priority}`);

    const now = new Date().toISOString();
    const newTask: Task = {
      id: data.id || generateId('task'),
      user_id: userId,
      title: data.title.trim(),
      description: data.description || null,
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      assignee_id: data.assignee_id || null,
      project_id: data.project_id || null,
      due_date: data.due_date || null,
      created_at: now,
      updated_at: now
    };
    this.taskRepo.create(newTask);
    return newTask;
  }

  update(id: string, data: Partial<Task>, userId: string): Task {
    const existing = this.taskRepo.findById(id, userId);
    if (!existing) throw new NotFoundError('Tarea no encontrada');
    if (data.status !== undefined && !STATUSES.includes(data.status)) throw new ValidationError(`status inválido: ${data.status}`);
    if (data.priority !== undefined && !PRIORITIES.includes(data.priority)) throw new ValidationError(`priority inválida: ${data.priority}`);
    if (data.title !== undefined && !data.title.trim()) throw new ValidationError('title no puede quedar vacío');

    const updated: Task = {
      ...existing,
      title: data.title !== undefined ? data.title.trim() : existing.title,
      description: data.description !== undefined ? data.description : existing.description,
      status: data.status !== undefined ? data.status : existing.status,
      priority: data.priority !== undefined ? data.priority : existing.priority,
      assignee_id: data.assignee_id !== undefined ? data.assignee_id : existing.assignee_id,
      project_id: data.project_id !== undefined ? data.project_id : existing.project_id,
      due_date: data.due_date !== undefined ? data.due_date : existing.due_date,
      updated_at: new Date().toISOString()
    };
    this.taskRepo.update(updated);
    return updated;
  }

  delete(id: string, userId: string): void {
    const existing = this.taskRepo.findById(id, userId);
    if (!existing) throw new NotFoundError('Tarea no encontrada');
    this.taskRepo.delete(id, userId);
  }
}
