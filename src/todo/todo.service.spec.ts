import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TodoService } from './todo.service';
import { PrismaService } from '../prisma/prisma.service';

const mockTodo = {
  id: 1,
  text: 'Test todo',
  notificationTime: '',
  deleted: false,
  isDone: false,
  deadline: '2025-12-31T23:59:59.000Z',
  ownerId: 'user-123',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

const mockPrismaService = {
  todo: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TodoService>(TodoService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should call prisma.todo.create with correct data and return the created todo', async () => {
      mockPrismaService.todo.create.mockResolvedValue(mockTodo);

      const dto = {
        text: 'Test todo',
        deadline: '2025-12-31T23:59:59.000Z',
        ownerId: 'user-123',
        notificationTime: '',
        deleted: false,
        isDone: false,
      };

      const result = await service.create(dto);

      expect(mockPrismaService.todo.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.todo.create).toHaveBeenCalledWith({
        data: {
          text: dto.text,
          notificationTime: dto.notificationTime,
          deleted: dto.deleted,
          isDone: dto.isDone,
          deadline: dto.deadline,
          ownerId: dto.ownerId,
        },
      });
      expect(result).toEqual(mockTodo);
    });

    it('should apply defaults for optional fields when not provided', async () => {
      mockPrismaService.todo.create.mockResolvedValue(mockTodo);

      await service.create({
        text: 'Minimal todo',
        deadline: '2025-12-31T23:59:59.000Z',
      } as any);

      expect(mockPrismaService.todo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notificationTime: '',
          deleted: false,
          isDone: false,
          ownerId: '',
        }),
      });
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should call prisma.todo.findMany with deleted: false and return the list', async () => {
      const todos = [mockTodo, { ...mockTodo, id: 2, text: 'Another todo' }];
      mockPrismaService.todo.findMany.mockResolvedValue(todos);

      const result = await service.findAll();

      expect(mockPrismaService.todo.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.todo.findMany).toHaveBeenCalledWith({
        where: { deleted: false },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(todos);
    });

    it('should return an empty array when there are no todos', async () => {
      mockPrismaService.todo.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should call prisma.todo.findUnique with correct id and return the todo', async () => {
      mockPrismaService.todo.findUnique.mockResolvedValue(mockTodo);

      const result = await service.findOne(1);

      expect(mockPrismaService.todo.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.todo.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockTodo);
    });

    it('should throw NotFoundException when todo is not found', async () => {
      mockPrismaService.todo.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Todo #999 not found');
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should call prisma.todo.update with correct id and data, then return updated todo', async () => {
      const updatedTodo = { ...mockTodo, text: 'Updated text', isDone: true };
      mockPrismaService.todo.findUnique.mockResolvedValue(mockTodo);
      mockPrismaService.todo.update.mockResolvedValue(updatedTodo);

      const result = await service.update(1, {
        text: 'Updated text',
        isDone: true,
      } as any);

      expect(mockPrismaService.todo.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.todo.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { text: 'Updated text', isDone: true },
      });
      expect(result).toEqual(updatedTodo);
    });

    it('should only include defined fields in the update data', async () => {
      mockPrismaService.todo.findUnique.mockResolvedValue(mockTodo);
      mockPrismaService.todo.update.mockResolvedValue(mockTodo);

      await service.update(1, { isDone: true } as any);

      expect(mockPrismaService.todo.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isDone: true },
      });
    });

    it('should throw NotFoundException when updating a non-existent todo', async () => {
      mockPrismaService.todo.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { text: 'x' } as any)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.todo.update).not.toHaveBeenCalled();
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft-delete by setting deleted: true via prisma.todo.update', async () => {
      const deletedTodo = { ...mockTodo, deleted: true };
      mockPrismaService.todo.findUnique.mockResolvedValue(mockTodo);
      mockPrismaService.todo.update.mockResolvedValue(deletedTodo);

      const result = await service.remove(1);

      expect(mockPrismaService.todo.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.todo.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deleted: true },
      });
      expect(result.deleted).toBe(true);
    });

    it('should throw NotFoundException when removing a non-existent todo', async () => {
      mockPrismaService.todo.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.todo.update).not.toHaveBeenCalled();
    });
  });

  // ─── findByOwner ────────────────────────────────────────────────────────────

  describe('findByOwner', () => {
    it('should return todos filtered by ownerId and not deleted', async () => {
      const ownerTodos = [mockTodo];
      mockPrismaService.todo.findMany.mockResolvedValue(ownerTodos);

      const result = await service.findByOwner('user-123');

      expect(mockPrismaService.todo.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-123', deleted: false },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(ownerTodos);
    });
  });

  // ─── findDueToday ───────────────────────────────────────────────────────────

  describe('findDueToday', () => {
    it('should query todos with deadline within today, not done, not deleted', async () => {
      mockPrismaService.todo.findMany.mockResolvedValue([mockTodo]);

      const result = await service.findDueToday();

      expect(mockPrismaService.todo.findMany).toHaveBeenCalledTimes(1);

      const callArg = mockPrismaService.todo.findMany.mock.calls[0][0];
      expect(callArg.where.deleted).toBe(false);
      expect(callArg.where.isDone).toBe(false);
      expect(callArg.where.deadline.gte).toBeDefined();
      expect(callArg.where.deadline.lte).toBeDefined();

      const gte = new Date(callArg.where.deadline.gte);
      const lte = new Date(callArg.where.deadline.lte);
      expect(gte.getHours()).toBe(0);
      expect(gte.getMinutes()).toBe(0);
      expect(lte.getHours()).toBe(23);
      expect(lte.getMinutes()).toBe(59);

      expect(result).toEqual([mockTodo]);
    });
  });
});
