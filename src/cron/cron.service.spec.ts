import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';

describe('CronService', () => {
  let service: CronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CronService],
    }).compile();

    service = module.get<CronService>(CronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleDailyNotifications', () => {
    it('should run without throwing', () => {
      expect(() => service.handleDailyNotifications()).not.toThrow();
    });

    it('should log the daily cron message', () => {
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => {});

      service.handleDailyNotifications();

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith('Running daily 10am cron job');
    });
  });
});
