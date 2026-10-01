import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const SCAN_INTERVAL_MS = 5 * 60 * 1000;
const COMPLETION_SCAN_INTERVAL_MS = 60 * 1000;

@Injectable()
export class RemindersService implements OnModuleInit {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectQueue('reminders-queue')
    private readonly remindersQueue: Queue,
  ) {}

  async onModuleInit() {
    // Stable jobId makes re-registration on every app restart a no-op if the schedule is unchanged.
    // BullMQ's queue.add() waits for the Redis connection indefinitely, so
    // without this guard an unreachable Redis would hang Nest's bootstrap and
    // the app would never start. Registration stays queued and completes on
    // its own once Redis reconnects.
    const registration = this.remindersQueue
      .add(
        'scan-appointments',
        {},
        {
          repeat: { every: SCAN_INTERVAL_MS },
          jobId: 'appointment-reminder-scan',
        },
      )
      .then(() => {
        this.logger.log(
          `Registered repeatable appointment-reminder scan every ${SCAN_INTERVAL_MS / 1000}s`,
        );
      })
      .catch((err: Error) => {
        this.logger.warn(
          `Failed to register appointment-reminder scan: ${err.message}`,
        );
      });

    // Auto-completion sweep: closes appointments whose slot passed, ends
    // consultations older than the 30 min limit, and ends stale call sessions.
    const completionRegistration = this.remindersQueue
      .add(
        'complete-past-sessions',
        {},
        {
          repeat: { every: COMPLETION_SCAN_INTERVAL_MS },
          jobId: 'session-completion-scan',
        },
      )
      .then(() => {
        this.logger.log(
          `Registered repeatable session-completion scan every ${COMPLETION_SCAN_INTERVAL_MS / 1000}s`,
        );
      })
      .catch((err: Error) => {
        this.logger.warn(
          `Failed to register session-completion scan: ${err.message}`,
        );
      });

    const timedOut = await Promise.race([
      Promise.all([registration, completionRegistration]).then(() => false),
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(true), 10_000),
      ),
    ]);

    if (timedOut) {
      this.logger.warn(
        'Redis unreachable during startup — continuing without appointment-reminder scan registration (will register once Redis connects).',
      );
    }
  }
}
