import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';

import { BookGolfSession } from '@dto/book-golf-session';
import { Handler } from 'aws-lambda';
import { HttpResponse } from '@dto/http-response/http-response';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { ValidationError } from '@errors/validation-error';
import { bookGolfSessionUseCase } from '@use-cases/book-golf-session';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { logger } from '@shared';
import middy from '@middy/core';

const tracer = new Tracer();
const metrics = new Metrics();

const bookGolfSessionAdapter: Handler<BookGolfSession, HttpResponse> = async (
  body: BookGolfSession
): Promise<HttpResponse> => {
  try {
    if (!body) throw new ValidationError('no payload body');

    const created = await bookGolfSessionUseCase(body);

    metrics.addMetric('SuccessfulBookGolfSession', MetricUnit.Count, 1);

    return {
      statusCode: 201,
      body: created,
    };
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) errorMessage = error.message;
    logger.error(errorMessage);

    metrics.addMetric('BookGolfSessionError', MetricUnit.Count, 1);

    return {
      statusCode: 500,
      body: { response: 'An error has occured' },
    };
  }
};

export const handler = middy(bookGolfSessionAdapter)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics));
