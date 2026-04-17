import { Module } from '@nestjs/common';
import { TodoService } from './todo.service';

@Module({
  providers: [TodoService],
  exports: [TodoService],
})
export class TodoModule {}
