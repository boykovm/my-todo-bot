import { Ctx, Help, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BotService } from './bot.service';
import * as TelegramTypes from 'typescript-telegram-bot-api/dist/types';
import { LlmService } from '../llm/llm.service';

@Update()
export class Bot {
  constructor(
    private readonly botService: BotService,
    private readonly llmService: LlmService,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    await ctx.reply('Welcome');
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply('Should be help');
  }

  @On('voice')
  async voiceHandler(@Ctx() ctx: Context) {
    // @ts-ignore
    const voice = ctx.message.voice as TelegramTypes.Voice;
    const fileId = voice.file_id;
    const file = await ctx.telegram.getFile(fileId);
    const response = await fetch(
      `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`,
    );
    const buffer = await response.arrayBuffer();

    try {
      const text = await this.llmService.getTextFromVoice(buffer);
      return await ctx.reply(`I got your voice, and it says: ${text}`);
    } catch (error) {
      console.log(error);
    }

    console.log(ctx);

    await ctx.reply('voice');
  }

  @On('message')
  async messageHandler(@Ctx() ctx: Context) {
    console.log(ctx.message);

    if (ctx.text) {
      return await ctx.reply('I got your text');
    }

    // await this.botService.getTextFromVoice(ctx.message.);
    console.log(ctx);

    await ctx.reply('Hello');
  }
}
