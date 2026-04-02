import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class BotService {
  constructor(readonly llmService: LlmService) {}

  async getTextFromVoice(file: ArrayBuffer): Promise<string> {
    // todo: add AI interaction
    return 'lol';
  }

  async processText(text: string): Promise<unknown> {
    return await this.classifyText(text);
  }

  async classifyText(text: string): Promise<string | null> {
    const response = await this.llmService.getTodoData(text);

    if (!response) {
      return null;
    }

    console.log(response);

    return response.text;
  }
}
