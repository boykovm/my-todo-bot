import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { TodoService } from '../todo/todo.service';
import { ToDoAction } from '../todo/dto/create-todo.dto';
import type { Todo } from '../todo/entities/todo.entity';

@Injectable()
export class BotService {
  constructor(
    readonly llmService: LlmService,
    private readonly todoService: TodoService,
  ) {}

  getTextFromVoice(_file: ArrayBuffer): string {
    // todo: add AI interaction
    return 'lol';
  }

  async handleText(text: string, ownerId: string): Promise<string> {
    return this.processText(text, ownerId);
  }

  async processText(text: string, ownerId: string): Promise<string> {
    const response = await this.classifyText(text);

    switch (response.action) {
      case ToDoAction.create: {
        const todo = await this.todoService.create({
          text: response.text,
          deadline: response.deadline,
          notificationTime: response.notificationTime,
          isDone: response.isDone,
          deleted: response.deleted,
          ownerId,
        });
        return this.formatCreated(todo);
      }

      case ToDoAction.update: {
        const match = await this.findMatchingTodo(response.text, ownerId);
        if (!match) {
          return `❌ Could not find a todo matching: "${response.text}"`;
        }
        const updated = await this.todoService.update(match.id, {
          text: response.text,
          deadline: response.deadline,
          notificationTime: response.notificationTime,
          isDone: response.isDone,
        });
        return this.formatUpdated(updated);
      }

      case ToDoAction.delete: {
        const match = await this.findMatchingTodo(response.text, ownerId);
        if (!match) {
          return `❌ Could not find a todo matching: "${response.text}"`;
        }
        await this.todoService.remove(match.id);
        return this.formatDeleted(match);
      }

      default:
        return `❓ Unknown action for: "${response.text}"`;
    }
  }

  async classifyText(text: string): Promise<ReturnType<LlmService['getTodoData']>> {
    return this.llmService.getTodoData(text);
  }

  private async findMatchingTodo(text: string, ownerId: string): Promise<Todo | undefined> {
    const todos = await this.todoService.findByOwner(ownerId);
    const query = text.toLowerCase();
    return todos.find(
      (t) => t.text.toLowerCase().includes(query) || query.includes(t.text.toLowerCase()),
    );
  }

  private formatCreated(todo: Todo): string {
    return `✅ Todo created!\n📝 ${todo.text}\n⏰ Deadline: ${todo.deadline}`;
  }

  private formatUpdated(todo: Todo): string {
    return `✏️ Todo updated!\n📝 ${todo.text}\n⏰ Deadline: ${todo.deadline}`;
  }

  private formatDeleted(todo: Todo): string {
    return `🗑️ Todo deleted: "${todo.text}"`;
  }
}
