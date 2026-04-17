import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { TodoService } from '../src/todo/todo.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TodoModule } from '../src/todo/todo.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { execSync } from 'child_process';

describe('TodoService (e2e)', () => {
  let app: INestApplication;
  let todoService: TodoService;
  let prisma: PrismaService;

  beforeAll(async () => {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env },
      stdio: 'inherit',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        TodoModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    todoService = moduleFixture.get<TodoService>(TodoService);
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.todo.deleteMany();
    await app.close();
  });

  afterEach(async () => {
    await prisma.todo.deleteMany();
  });

  const seedTodo = (
    overrides: Partial<{
      text: string;
      deadline: string;
      ownerId: string;
      isDone: boolean;
      deleted: boolean;
      notificationTime: string;
    }> = {},
  ) => ({
    text: 'Test todo',
    deadline: '2025-12-31T23:59:59.000Z',
    ownerId: 'user-123',
    isDone: false,
    deleted: false,
    notificationTime: '',
    ...overrides,
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should persist a new todo to the database', async () => {
      const dto = seedTodo();
      const result = await todoService.create(dto);

      expect(result).toMatchObject({
        id: expect.any(Number),
        text: dto.text,
        deadline: dto.deadline,
        ownerId: dto.ownerId,
        isDone: false,
        deleted: false,
      });

      const inDb = await prisma.todo.findUnique({ where: { id: result.id } });
      expect(inDb).not.toBeNull();
      expect(inDb!.text).toBe(dto.text);
    });

    it('should use default values for optional fields', async () => {
      const result = await todoService.create({
        text: 'Minimal todo',
        deadline: '2025-12-31T00:00:00.000Z',
      } as any);

      expect(result.notificationTime).toBe('');
      expect(result.ownerId).toBe('');
      expect(result.isDone).toBe(false);
      expect(result.deleted).toBe(false);
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all non-deleted todos', async () => {
      await todoService.create(seedTodo({ text: 'Todo 1' }));
      await todoService.create(seedTodo({ text: 'Todo 2' }));

      const result = await todoService.findAll();

      expect(result).toHaveLength(2);
      expect(result.every((t) => !t.deleted)).toBe(true);
    });

    it('should exclude soft-deleted todos', async () => {
      const todo = await todoService.create(
        seedTodo({ text: 'To be deleted' }),
      );
      await todoService.remove(todo.id);

      const result = await todoService.findAll();

      expect(result).toHaveLength(0);
    });

    it('should return an empty array when there are no todos', async () => {
      const result = await todoService.findAll();
      expect(result).toEqual([]);
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the correct todo by id', async () => {
      const created = await todoService.create(seedTodo({ text: 'Find me' }));

      const result = await todoService.findOne(created.id);

      expect(result.id).toBe(created.id);
      expect(result.text).toBe('Find me');
    });

    it('should throw NotFoundException for a non-existent id', async () => {
      await expect(todoService.findOne(999999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(todoService.findOne(999999)).rejects.toThrow(
        'Todo #999999 not found',
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update the specified fields and persist to the database', async () => {
      const created = await todoService.create(seedTodo());

      const result = await todoService.update(created.id, {
        text: 'Updated text',
        isDone: true,
      } as any);

      expect(result.text).toBe('Updated text');
      expect(result.isDone).toBe(true);

      const inDb = await prisma.todo.findUnique({ where: { id: created.id } });
      expect(inDb!.text).toBe('Updated text');
      expect(inDb!.isDone).toBe(true);
    });

    it('should not change fields that were not provided in the update', async () => {
      const created = await todoService.create(
        seedTodo({ text: 'Original', ownerId: 'owner-abc' }),
      );

      await todoService.update(created.id, { isDone: true } as any);

      const inDb = await prisma.todo.findUnique({ where: { id: created.id } });
      expect(inDb!.text).toBe('Original');
      expect(inDb!.ownerId).toBe('owner-abc');
    });

    it('should throw NotFoundException when updating a non-existent todo', async () => {
      await expect(
        todoService.update(999999, { text: 'x' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft-delete a todo by setting deleted: true', async () => {
      const created = await todoService.create(seedTodo());

      const result = await todoService.remove(created.id);

      expect(result.deleted).toBe(true);

      const inDb = await prisma.todo.findUnique({ where: { id: created.id } });
      expect(inDb!.deleted).toBe(true);
    });

    it('should not physically remove the record from the database', async () => {
      const created = await todoService.create(seedTodo());
      await todoService.remove(created.id);

      const inDb = await prisma.todo.findUnique({ where: { id: created.id } });
      expect(inDb).not.toBeNull();
    });

    it('should throw NotFoundException when removing a non-existent todo', async () => {
      await expect(todoService.remove(999999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findByOwner ────────────────────────────────────────────────────────────

  describe('findByOwner', () => {
    it('should return only todos belonging to the given ownerId', async () => {
      await todoService.create(seedTodo({ ownerId: 'user-A' }));
      await todoService.create(seedTodo({ ownerId: 'user-A' }));
      await todoService.create(seedTodo({ ownerId: 'user-B' }));

      const result = await todoService.findByOwner('user-A');

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.ownerId === 'user-A')).toBe(true);
    });

    it('should exclude deleted todos for the owner', async () => {
      const todo = await todoService.create(seedTodo({ ownerId: 'user-A' }));
      await todoService.remove(todo.id);

      const result = await todoService.findByOwner('user-A');

      expect(result).toHaveLength(0);
    });
  });

  // ─── findDueToday ───────────────────────────────────────────────────────────

  describe('findDueToday', () => {
    it('should return todos with a deadline within today that are not done and not deleted', async () => {
      const todayNoon = new Date();
      todayNoon.setHours(12, 0, 0, 0);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await todoService.create(
        seedTodo({ deadline: todayNoon.toISOString(), text: 'Due today' }),
      );
      await todoService.create(
        seedTodo({ deadline: tomorrow.toISOString(), text: 'Due tomorrow' }),
      );

      const result = await todoService.findDueToday();

      expect(result.some((t) => t.text === 'Due today')).toBe(true);
      expect(result.some((t) => t.text === 'Due tomorrow')).toBe(false);
    });

    it('should exclude completed todos from the due-today list', async () => {
      const todayNoon = new Date();
      todayNoon.setHours(12, 0, 0, 0);

      const todo = await todoService.create(
        seedTodo({ deadline: todayNoon.toISOString() }),
      );
      await todoService.update(todo.id, { isDone: true } as any);

      const result = await todoService.findDueToday();

      expect(result.some((t) => t.id === todo.id)).toBe(false);
    });
  });
});
