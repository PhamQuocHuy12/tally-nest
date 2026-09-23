import type { SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = () =>
  Promise.reject(new Error('AI worker behavior has not been implemented.'));
