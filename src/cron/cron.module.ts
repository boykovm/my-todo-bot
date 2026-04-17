import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { TodoModule } from '../todo/todo.module';

@Module({
  imports: [TodoModule],
  providers: [CronService],
})
export class CronModule {}
