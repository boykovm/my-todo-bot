import { Injectable } from '@nestjs/common';

@Injectable()
export class LlmService {
  async getTextFromVoice(buffer: ArrayBuffer): Promise<string> {
    return 'lol';
  }
}
