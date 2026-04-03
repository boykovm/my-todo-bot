import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { ToDoAction } from '../todo/dto/create-todo.dto';

@Injectable()
export class BotService {
  constructor(readonly llmService: LlmService) {}

  async getTextFromVoice(file: ArrayBuffer): Promise<string> {
    // todo: add AI interaction
    return 'lol';
  }

  async handleText(text: string) {
    return await this.processText(text);
  }

  async processText(text: string): Promise<string> {
    const response = await this.classifyText(text);

    switch (response.action) {
      case ToDoAction.update:
        return `${response.text} + action: ${response.action}`;
      case ToDoAction.delete:
        return `${response.text} + action: ${response.action}`;
      case ToDoAction.create:
      default:
        return `${response.text} + action: ${response.action}`;
    }
  }

  async classifyText(text: string) {
    return await this.llmService.getTodoData(text);
  }
}
