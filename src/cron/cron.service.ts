import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { TodoService } from '../todo/todo.service';
import type { Todo } from '../todo/entities/todo.entity';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectBot('m1x2d0s') private readonly bot: Telegraf,
    private readonly todoService: TodoService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async handleDailyNotifications(): Promise<void> {
    this.logger.log('Running daily 10am cron job');

    let todos: Todo[];

    try {
      todos = await this.todoService.findDueToday();
    } catch (error) {
      this.logger.error('Failed to fetch due todos from DB', error);
      return;
    }

    if (!todos.length) {
      this.logger.log('No todos due today — skipping notifications');
      return;
    }

    const byOwner = todos.reduce<Record<string, Todo[] | undefined>>((acc, todo) => {
      if (!todo.ownerId) {
        return acc;
      }
      const existing = acc[todo.ownerId];
      if (existing) {
        existing.push(todo);
      } else {
        acc[todo.ownerId] = [todo];
      }
      return acc;
    }, {});

    for (const [ownerId, ownerTodos] of Object.entries(byOwner) as [string, Todo[]][]) {
      try {
        const message = this.formatMessage(ownerTodos);
        await this.bot.telegram.sendMessage(ownerId, message, {
          parse_mode: 'HTML',
        });
        this.logger.log(`Sent ${String(ownerTodos.length)} reminder(s) to user ${ownerId}`);
      } catch (error) {
        this.logger.error(`Failed to send notification to user ${ownerId}`, error);
      }
    }
  }

  public formatMessage(todos: Todo[]): string {
    const lines = todos.map((todo, index) => {
      const deadline = new Date(todo.deadline);
      const time = deadline.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${String(index + 1)}. ${todo.text}  ⏰ <b>${time}</b>`;
    });

    return [
      '📋 <b>Your tasks due today:</b>',
      '',
      ...lines,
      '',
      "✅ Don't forget to complete them!",
    ].join('\n');
  }
}
