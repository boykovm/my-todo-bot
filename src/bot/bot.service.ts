import { Injectable } from '@nestjs/common';

@Injectable()
export class BotService {
  async getTextFromVoice(file: ArrayBuffer): Promise<string> {
    // todo: add AI interaction
    return 'lol';
  }
}
