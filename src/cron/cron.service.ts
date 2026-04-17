import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  handleDailyNotifications(): void {
    this.logger.log('Running daily 10am cron job');
  }
}
