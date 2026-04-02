import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'node:fs';

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
}
