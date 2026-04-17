import { Test, type TestingModule } from '@nestjs/testing';
import { type Logger } from '@nestjs/common';
import { CronService } from './cron.service';
import { TodoService } from '../todo/todo.service';
import type { Todo } from '../todo/entities/todo.entity';
import { getBotToken } from 'nestjs-telegraf';

type CronServiceWithLogger = CronService & { logger: Logger };

const makeTodo = (
  overrides: Partial<{
    id: number;
    text: string;
    deadline: string;
    ownerId: string;
    isDone: boolean;
    deleted: boolean;
    notificationTime: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
): Todo => ({
  id: 1,
  text: 'Test todo',
  deadline: new Date().toISOString(),
  ownerId: '123456',
  isDone: false,
  deleted: false,
  notificationTime: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockTodoService = {
  findDueToday: jest.fn(),
};

const mockSendMessage = jest.fn();

const mockBot = {
  telegram: {
    sendMessage: mockSendMessage,
  },
};

describe('CronService', () => {
  let service: CronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        { provide: TodoService, useValue: mockTodoService },
        { provide: getBotToken('m1x2d0s'), useValue: mockBot },
      ],
    }).compile();

    service = module.get<CronService>(CronService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleDailyNotifications', () => {
    it('should log startup message on every run', async () => {
      mockTodoService.findDueToday.mockResolvedValue([]);
      const logSpy = jest
        .spyOn((service as unknown as CronServiceWithLogger).logger, 'log')
        .mockImplementation(() => undefined);

      await service.handleDailyNotifications();

      expect(logSpy).toHaveBeenCalledWith('Running daily 10am cron job');
    });

    it('should log and return early when no todos are due today', async () => {
      mockTodoService.findDueToday.mockResolvedValue([]);
      const logSpy = jest
        .spyOn((service as unknown as CronServiceWithLogger).logger, 'log')
        .mockImplementation(() => undefined);

      await service.handleDailyNotifications();

      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('No todos due today — skipping notifications');
    });

    it('should send one message per user with their due todos', async () => {
      mockTodoService.findDueToday.mockResolvedValue([
        makeTodo({ id: 1, text: 'Task A', ownerId: 'user-1' }),
        makeTodo({ id: 2, text: 'Task B', ownerId: 'user-1' }),
        makeTodo({ id: 3, text: 'Task C', ownerId: 'user-2' }),
      ]);
      mockSendMessage.mockResolvedValue({});

      await service.handleDailyNotifications();

      expect(mockSendMessage).toHaveBeenCalledTimes(2);
      expect(mockSendMessage).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('Task A'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('Task B'),
        expect.any(Object),
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        'user-2',
        expect.stringContaining('Task C'),
        expect.any(Object),
      );
    });

    it('should skip todos with no ownerId', async () => {
      mockTodoService.findDueToday.mockResolvedValue([
        makeTodo({ id: 1, text: 'Orphan task', ownerId: '' }),
      ]);

      await service.handleDailyNotifications();

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should continue sending to other users when one fails', async () => {
      mockTodoService.findDueToday.mockResolvedValue([
        makeTodo({ id: 1, text: 'Task for failing user', ownerId: 'user-bad' }),
        makeTodo({ id: 2, text: 'Task for good user', ownerId: 'user-good' }),
      ]);
      mockSendMessage.mockRejectedValueOnce(new Error('Telegram error')).mockResolvedValueOnce({});

      const errorSpy = jest
        .spyOn((service as unknown as CronServiceWithLogger).logger, 'error')
        .mockImplementation(() => undefined);

      await service.handleDailyNotifications();

      expect(mockSendMessage).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('user-bad'), expect.any(Error));
    });

    it('should log an error and return when DB fetch fails', async () => {
      mockTodoService.findDueToday.mockRejectedValue(new Error('DB down'));
      const errorSpy = jest
        .spyOn((service as unknown as CronServiceWithLogger).logger, 'error')
        .mockImplementation(() => undefined);

      await service.handleDailyNotifications();

      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith('Failed to fetch due todos from DB', expect.any(Error));
    });
  });

  describe('formatMessage', () => {
    it('should include the task text and deadline time in the message', () => {
      const deadline = new Date();
      deadline.setHours(14, 30, 0, 0);

      const todos: Todo[] = [makeTodo({ text: 'Buy groceries', deadline: deadline.toISOString() })];
      const message = service.formatMessage(todos);

      expect(message).toContain('Buy groceries');
      expect(message).toContain('14:30');
      expect(message).toContain('Your tasks due today');
    });

    it('should number multiple tasks', () => {
      const todos: Todo[] = [
        makeTodo({ id: 1, text: 'First task' }),
        makeTodo({ id: 2, text: 'Second task' }),
      ];
      const message = service.formatMessage(todos);

      expect(message).toContain('1.');
      expect(message).toContain('2.');
    });
  });
});
