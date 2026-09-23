import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = () =>
  Promise.resolve({
    body: JSON.stringify({ code: 'NOT_IMPLEMENTED' }),
    headers: { 'content-type': 'application/json' },
    statusCode: 501,
  });
