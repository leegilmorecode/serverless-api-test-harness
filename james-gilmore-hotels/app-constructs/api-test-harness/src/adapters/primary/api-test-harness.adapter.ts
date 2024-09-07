import { app } from './api-test-harness-service';
import awsLambdaFastify from '@fastify/aws-lambda';

export const handler = awsLambdaFastify(app);
