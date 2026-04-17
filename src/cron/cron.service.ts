import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { TodoService } from '../todo/todo.service';

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

    let todos: Awaited<ReturnType<typeof this.todoService.findDueToday>>;

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

    // Group todos by ownerId (Telegram chat ID)
    const byOwner = todos.reduce<Record<string, typeof todos>>((acc, todo) => {
      if (!todo.ownerId) return acc;
      if (!acc[todo.ownerId]) acc[todo.ownerId] = [];
      acc[todo.ownerId].push(todo);
      return acc;
    }, {});

    for (const [ownerId, ownerTodos] of Object.entries(byOwner)) {
      try {
        const message = this.formatMessage(ownerTodos);
        await this.bot.telegram.sendMessage(ownerId, message, {
          parse_mode: 'HTML',
        });
        this.logger.log(
          `Sent ${ownerTodos.length} reminder(s) to user ${ownerId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send notification to user ${ownerId}`,
          error,
        );
      }
    }
  }

  private formatMessage(
    todos: Awaited<ReturnType<typeof this.todoService.findDueToday>>,
  ): string {
    const lines = todos.map((todo, index) => {
      const deadline = new Date(todo.deadline);
      const time = deadline.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${index + 1}. ${todo.text}  ⏰ <b>${time}</b>`;
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
