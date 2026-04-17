import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';
import { LlmService } from '../llm/llm.service';
import { ToDoAction } from '../todo/dto/create-todo.dto';

const mockLlmService = {
  getTodoData: jest.fn(),
  getTextFromFile: jest.fn(),
};

describe('BotService', () => {
  let service: BotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: LlmService, useValue: mockLlmService },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyText', () => {
    it('should delegate to llmService.getTodoData and return the result', async () => {
      const mockResult = {
        text: 'Buy milk',
        action: ToDoAction.create,
        deadline: '2025-12-31T00:00:00.000Z',
        isDone: false,
        deleted: false,
        notificationTime: '',
        ownerId: '',
      };
      mockLlmService.getTodoData.mockResolvedValue(mockResult);

      const result = await service.classifyText('Buy milk');

      expect(mockLlmService.getTodoData).toHaveBeenCalledTimes(1);
      expect(mockLlmService.getTodoData).toHaveBeenCalledWith('Buy milk');
      expect(result).toEqual(mockResult);
    });
  });

  describe('processText', () => {
    it('should handle create action', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        text: 'Buy milk',
        action: ToDoAction.create,
      });

      const result = await service.processText('Buy milk');

      expect(result).toContain('Buy milk');
      expect(result).toContain(ToDoAction.create);
    });

    it('should handle update action', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        text: 'Update task',
        action: ToDoAction.update,
      });

      const result = await service.processText('Update task');

      expect(result).toContain('Update task');
      expect(result).toContain(ToDoAction.update);
    });

    it('should handle delete action', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        text: 'Delete task',
        action: ToDoAction.delete,
      });

      const result = await service.processText('Delete task');

      expect(result).toContain('Delete task');
      expect(result).toContain(ToDoAction.delete);
    });
  });

  describe('handleText', () => {
    it('should call processText and return its result', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        text: 'Some task',
        action: ToDoAction.create,
      });

      const result = await service.handleText('Some task');

      expect(mockLlmService.getTodoData).toHaveBeenCalledWith('Some task');
      expect(result).toContain('Some task');
    });
  });
});
