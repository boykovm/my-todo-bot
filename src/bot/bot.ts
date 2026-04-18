import { Ctx, Help, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BotService } from './bot.service';
import type * as TelegramTypes from 'typescript-telegram-bot-api/dist/types';
import { LlmService } from '../llm/llm.service';
import { Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, unlink } from 'fs/promises';

@Update()
export class Bot {
  private readonly logger = new Logger(Bot.name);

  constructor(
    private readonly botService: BotService,
    private readonly llmService: LlmService,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply('Welcome');
  }

  @Help()
  async help(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply('Should be help');
  }

  @On('voice')
  async voiceHandler(@Ctx() ctx: Context): Promise<void> {
    // @ts-expect-error: telegraf context typing does not expose voice on generic Context
    const voice = ctx.message.voice as TelegramTypes.Voice;
    const { mp3FilePath, oggFilePath } = await this.convertVoiceIntoMp3(ctx, voice);

    try {
      const ownerId = String(ctx.from?.id ?? '');
      const text = await this.llmService.getTextFromFile(mp3FilePath);
      const response = await this.botService.handleText(text, ownerId);
      await ctx.reply(response);
      return;
    } catch (error) {
      this.logger.error('Failed to process voice message', error);
    } finally {
      await this.cleanUpFiles(oggFilePath, mp3FilePath);
    }

    await ctx.reply('Looks like text was not recognized, try again or use text instead of voice');
  }

  @On('message')
  async messageHandler(@Ctx() ctx: Context): Promise<void> {
    const { from: { id } = { id: null as number | null } } = ctx.message as TelegramTypes.Message;
    const ownerId = String(id ?? '');

    if (ctx.text) {
      const response = await this.botService.handleText(ctx.text, ownerId);
      await ctx.reply(response);
      return;
    }

    await ctx.reply('there was an issue');
  }

  private async convertVoiceIntoMp3(
    @Ctx() ctx: Context,
    voice: TelegramTypes.Voice,
  ): Promise<{ oggFilePath: string; mp3FilePath: string }> {
    const { file_id, file_unique_id } = voice;

    const oggFilePath = `temp_${file_unique_id}_${Date.now()}.ogg`;
    const mp3FilePath = `temp_${file_unique_id}_${Date.now()}.mp3`;

    const file = await ctx.telegram.getFile(file_id);

    const response = await fetch(
      `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path ?? ''}`,
    );

    const arrayBuffer = await response.arrayBuffer();

    await writeFile(oggFilePath, Buffer.from(arrayBuffer));

    await this.ffmpegPromise(oggFilePath, mp3FilePath);

    return { oggFilePath, mp3FilePath };
  }

  private ffmpegPromise(inputPath: string, outputPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('mp3')
        .on('end', () => {
          resolve();
        })
        .on('error', reject)
        .save(outputPath);
    });
  }

  private async cleanUpFiles(...files: string[]): Promise<void> {
    const promises = files.map((file) => unlink(file));

    await Promise.allSettled(promises).then((results) => {
      results
        .filter((result) => result.status === 'rejected')
        .forEach((result) => {
          this.logger.error(
            'Failed to delete file:',
            result.reason instanceof Error ? result.reason.message : String(result.reason),
          );
        });
    });
  }
}
