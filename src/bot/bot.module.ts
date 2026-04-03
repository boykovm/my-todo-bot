import { Module } from '@nestjs/common';
import { Bot } from './bot';
import { BotService } from './bot.service';
import { LlmModule } from '../llm/llm.module';
import { TodoModule } from '../todo/todo.module';

@Module({
  imports: [LlmModule, TodoModule],
  providers: [Bot, BotService],
})
export class BotModule {}
