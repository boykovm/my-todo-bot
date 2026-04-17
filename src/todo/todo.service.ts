import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTodoDto: CreateTodoDto) {
    return this.prisma.todo.create({
      data: {
        text: createTodoDto.text,
        notificationTime: createTodoDto.notificationTime ?? '',
        deleted: createTodoDto.deleted ?? false,
        isDone: createTodoDto.isDone ?? false,
        deadline: createTodoDto.deadline,
        ownerId: createTodoDto.ownerId ?? '',
      },
    });
  }

  async findAll() {
    return this.prisma.todo.findMany({
      where: { deleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const todo = await this.prisma.todo.findUnique({
      where: { id },
    });

    if (!todo) {
      throw new NotFoundException(`Todo #${id} not found`);
    }

    return todo;
  }

  async update(id: number, updateTodoDto: UpdateTodoDto) {
    await this.findOne(id);

    return this.prisma.todo.update({
      where: { id },
      data: {
        ...(updateTodoDto.text !== undefined && { text: updateTodoDto.text }),
        ...(updateTodoDto.notificationTime !== undefined && {
          notificationTime: updateTodoDto.notificationTime,
        }),
        ...(updateTodoDto.isDone !== undefined && {
          isDone: updateTodoDto.isDone,
        }),
        ...(updateTodoDto.deadline !== undefined && {
          deadline: updateTodoDto.deadline,
        }),
        ...(updateTodoDto.ownerId !== undefined && {
          ownerId: updateTodoDto.ownerId,
        }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.todo.update({
      where: { id },
      data: { deleted: true },
    });
  }

  async findByOwner(ownerId: string) {
    return this.prisma.todo.findMany({
      where: { ownerId, deleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findDueToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.todo.findMany({
      where: {
        deleted: false,
        isDone: false,
        deadline: {
          gte: startOfDay.toISOString(),
          lte: endOfDay.toISOString(),
        },
      },
    });
  }
}
