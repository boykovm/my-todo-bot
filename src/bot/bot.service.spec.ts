import { Test, type TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';
import { LlmService } from '../llm/llm.service';
import { TodoService } from '../todo/todo.service';
import { ToDoAction } from '../todo/dto/create-todo.dto';
import type { Todo } from '../todo/entities/todo.entity';

const mockLlmService = {
  getTodoData: jest.fn(),
  getTextFromFile: jest.fn(),
};

const mockTodoService = {
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findByOwner: jest.fn(),
};

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 1,
  text: 'Buy milk',
  deadline: '2025-12-31T00:00:00.000Z',
  notificationTime: '',
  isDone: false,
  deleted: false,
  ownerId: 'user-123',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  ...overrides,
});

const OWNER_ID = 'user-123';

const baseLlmResponse = {
  text: 'Buy milk',
  deadline: '2025-12-31T00:00:00.000Z',
  notificationTime: '',
  isDone: false,
  deleted: false,
  ownerId: '',
};

describe('BotService', () => {
  let service: BotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: LlmService, useValue: mockLlmService },
        { provide: TodoService, useValue: mockTodoService },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── classifyText ──────────────────────────────────────────────────────────

  describe('classifyText', () => {
    it('should delegate to llmService.getTodoData and return the result', async () => {
      const mockResult = { ...baseLlmResponse, action: ToDoAction.create };
      mockLlmService.getTodoData.mockResolvedValue(mockResult);

      const result = await service.classifyText('Buy milk');

      expect(mockLlmService.getTodoData).toHaveBeenCalledTimes(1);
      expect(mockLlmService.getTodoData).toHaveBeenCalledWith('Buy milk');
      expect(result).toStrictEqual(mockResult);
    });
  });

  // ─── processText — create ──────────────────────────────────────────────────

  describe('processText — create', () => {
    it('should call todoService.create with extracted data and the provided ownerId', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        ...baseLlmResponse,
        action: ToDoAction.create,
      });
      const created = makeTodo();
      mockTodoService.create.mockResolvedValue(created);

      await service.processText('Buy milk', OWNER_ID);

      expect(mockTodoService.create).toHaveBeenCalledTimes(1);
      expect(mockTodoService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: baseLlmResponse.text,
          deadline: baseLlmResponse.deadline,
          ownerId: OWNER_ID,
        }),
      );
    });

    it('should return a confirmation message containing the todo text and deadline', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        ...baseLlmResponse,
        action: ToDoAction.create,
      });
      mockTodoService.create.mockResolvedValue(makeTodo());

      const result = await service.processText('Buy milk', OWNER_ID);

      expect(result).toContain('Buy milk');
      expect(result).toContain('2025-12-31T00:00:00.000Z');
      expect(result).toContain('✅');
    });
  });

  // ─── processText — update ──────────────────────────────────────────────────

  describe('processText — update', () => {
    it('should find the matching todo and call todoService.update', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        ...baseLlmResponse,
        text: 'Buy milk updated',
        action: ToDoAction.update,
      });
      const existing = makeTodo({ text: 'Buy milk' });
      mockTodoService.findByOwner.mockResolvedValue([existing]);
      const updated = makeTodo({ text: 'Buy milk updated' });
      mockTodoService.update.mockResolvedValue(updated);

      const result = await service.processText('Buy milk updated', OWNER_ID);

      expect(mockTodoService.findByOwner).toHaveBeenCalledWith(OWNER_ID);
      expect(mockTodoService.update).toHaveBeenCalledWith(
        existing.id,
        expect.objectContaining({ text: 'Buy milk updated' }),
      );
      expect(result).toContain('Buy milk updated');
      expect(result).toContain('✏️');
    });

    it('should return a not-found message when no matching todo exists', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        ...baseLlmResponse,
        text: 'Non-existent task',
        action: ToDoAction.update,
      });
      mockTodoService.findByOwner.mockResolvedValue([]);

      const result = await service.processText('Non-existent task', OWNER_ID);

      expect(mockTodoService.update).not.toHaveBeenCalled();
      expect(result).toContain('❌');
      expect(result).toContain('Non-existent task');
    });

    it('should match a todo when the query contains the todo text', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        ...baseLlmResponse,
        text: 'milk',
        action: ToDoAction.update,
      });
      const existing = makeTodo({ text: 'Buy milk' });
      mockTodoService.findByOwner.mockResolvedValue([existing]);
      mockTodoService.update.mockResolvedValue(existing);

      await service.processText('milk', OWNER_ID);

      expect(mockTodoService.update).toHaveBeenCalledWith(existing.id, expect.any(Object));
    });
  });

  // ─── processText — delete ──────────────────────────────────────────────────

  describe('processText — delete', () => {
    it('should find the matching todo and call todoService.remove', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        ...baseLlmResponse,
        text: 'Buy milk',
        action: ToDoAction.delete,
      });
      const existing = makeTodo();
      mockTodoService.findByOwner.mockResolvedValue([existing]);
      mockTodoService.remove.mockResolvedValue(existing);

      const result = await service.processText('Buy milk', OWNER_ID);

      expect(mockTodoService.findByOwner).toHaveBeenCalledWith(OWNER_ID);
      expect(mockTodoService.remove).toHaveBeenCalledWith(existing.id);
      expect(result).toContain('🗑️');
      expect(result).toContain('Buy milk');
    });

    it('should return a not-found message when no matching todo exists', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        ...baseLlmResponse,
        text: 'Non-existent task',
        action: ToDoAction.delete,
      });
      mockTodoService.findByOwner.mockResolvedValue([]);

      const result = await service.processText('Non-existent task', OWNER_ID);

      expect(mockTodoService.remove).not.toHaveBeenCalled();
      expect(result).toContain('❌');
      expect(result).toContain('Non-existent task');
    });
  });

  // ─── handleText ────────────────────────────────────────────────────────────

  describe('handleText', () => {
    it('should delegate to processText with both text and ownerId', async () => {
      mockLlmService.getTodoData.mockResolvedValue({
        ...baseLlmResponse,
        action: ToDoAction.create,
      });
      mockTodoService.create.mockResolvedValue(makeTodo());

      const result = await service.handleText('Buy milk', OWNER_ID);

      expect(mockLlmService.getTodoData).toHaveBeenCalledWith('Buy milk');
      expect(mockTodoService.create).toHaveBeenCalled();
      expect(result).toContain('Buy milk');
    });
  });
});
