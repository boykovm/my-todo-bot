import { Module } from '@nestjs/common';
import { Bot } from './bot';
import { BotService } from './bot.service';

@Module({
  providers: [Bot, BotService],
})
export class BotModule {}
