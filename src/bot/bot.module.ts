import { Module } from '@nestjs/common';
import { Bot } from './bot';
import { BotService } from './bot.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [Bot, BotService],
})
export class BotModule {}
