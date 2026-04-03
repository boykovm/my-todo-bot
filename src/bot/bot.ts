import { Ctx, Help, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BotService } from './bot.service';
import * as TelegramTypes from 'typescript-telegram-bot-api/dist/types';
import { LlmService } from '../llm/llm.service';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, unlink } from 'fs/promises';

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const voice = ctx.message.voice as TelegramTypes.Voice;
    const { mp3FilePath, oggFilePath } = await this.convertVoiceIntoMp3(
      ctx,
      voice,
    );

    try {
      const text = await this.llmService.getTextFromFile(mp3FilePath);

      const response = await this.botService.handleText(text);

      await ctx.reply(`I got your voice from file: ${text}`);
      return;
    } catch (error) {
      console.log(error);
    } finally {
      await this.cleanUpFiles(oggFilePath, mp3FilePath);
    }

    await ctx.reply(
      'Looks like text was not recognized, try again or use text instead of voice',
    );
  }

  @On('message')
  async messageHandler(@Ctx() ctx: Context) {
    const { from: { id } = { id: null as number | null } } =
      ctx.message as TelegramTypes.Message;

    if (ctx.text) {
      const response = await this.botService.handleText(ctx.text);

      await ctx.reply(`I got your text from userId: ${id}`);
      return;
    }

    await ctx.reply('there was an issue');
    return;
  }

  private async convertVoiceIntoMp3(
    @Ctx() ctx: Context,
    voice: TelegramTypes.Voice,
  ) {
    const { file_id, file_unique_id } = voice;

    const oggFilePath = `temp_${file_unique_id}_${Date.now()}.ogg`;
    const mp3FilePath = `temp_${file_unique_id}_${Date.now()}.mp3`;

    const file = await ctx.telegram.getFile(file_id);

    const response = await fetch(
      `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`,
    );

    const arrayBuffer = await response.arrayBuffer();

    await writeFile(oggFilePath, Buffer.from(arrayBuffer));

    await this.ffmpegPromise(oggFilePath, mp3FilePath);

    return {
      oggFilePath,
      mp3FilePath,
    };
  }

  private async ffmpegPromise(inputPath: string, outputPath: string) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('mp3')
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });
  }

  private async cleanUpFiles(...files: string[]) {
    const promises = files.map((file) => unlink(file));

    await Promise.allSettled(promises).then((results) => {
      results
        .filter((result) => result.status === 'rejected')
        .forEach((result) => {
          console.error(
            'Failed to delete file:',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            result?.reason?.path || result.reason,
          );
        });
    });
  }
}
