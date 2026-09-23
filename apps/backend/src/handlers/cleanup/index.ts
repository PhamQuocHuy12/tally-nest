import type { ScheduledHandler } from 'aws-lambda';

export const handler: ScheduledHandler = () =>
  Promise.reject(new Error('Cleanup behavior has not been implemented.'));
