import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ToDoSchema = z.object({
  text: z.string(),
  notificationTime: z.string().optional().default(''),
  deleted: z.boolean().optional().default(false),
  isDone: z.boolean().optional().default(false),
  deadline: z.string(),
  ownerId: z.string().optional().default(''),
});

export enum ToDoAction {
  create = 'create',
  update = 'update',
  delete = 'delete',
}

export const ToDoSchemaExtractor = ToDoSchema.extend({
  action: z.enum(ToDoAction).default(ToDoAction.create),
});

export class CreateTodoDto extends createZodDto(ToDoSchema) {}
