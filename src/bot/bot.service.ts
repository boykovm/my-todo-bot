import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class BotService {
  constructor(readonly llmService: LlmService) {}

  async getTextFromVoice(file: ArrayBuffer): Promise<string> {
    // todo: add AI interaction
    return 'lol';
  }
}
