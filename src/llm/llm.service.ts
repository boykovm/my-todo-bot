import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import * as fs from 'node:fs';
import { z } from 'zod';

const ToDoExtraction = z.object({
  text: z.string(),
  notificationTime: z.string().optional().nullable(),
  deleted: z.boolean().optional().nullable(),
  isDone: z.boolean().optional().nullable(),
  deadline: z.string(),
  action: z.enum(['create', 'update', 'delete']),
});

@Injectable()
export class LlmService implements OnModuleInit {
  private client: OpenAI;

  onModuleInit(): void {
    this.client = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY'],
    });
  }

  async getTextFromFile(filePath: string) {
    return await this.client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'gpt-4o-transcribe',
      response_format: 'text',
    });
  }

  async getTodoData(text: string) {
    const now = new Date().toISOString();

    const response = await this.client.responses.parse({
      model: 'gpt-5.4-nano',
      input: [
        {
          role: 'system',
          content:
            'You are an expert at structured data extraction. ' +
            'You will be given unstructured text from a user and should convert it into the given structure. ' +
            `Also, you should classify action may be the following: [create, update, delete] if not provided - use create, if deadline is not provided use tomorrow date for reference, today is ${now} and use ISO format for date`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      text: {
        format: zodTextFormat(ToDoExtraction, 'ToDoExtraction'),
      },
    });

    return response?.output_parsed || null;
  }
}
