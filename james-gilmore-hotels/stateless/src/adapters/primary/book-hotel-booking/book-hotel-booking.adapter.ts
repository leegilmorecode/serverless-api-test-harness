import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';

import { BookHotelBooking } from '@dto/book-hotel-booking';
import { Handler } from 'aws-lambda';
import { HttpResponse } from '@dto/http-response/http-response';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { ValidationError } from '@errors/validation-error';
import { bookHotelBookingUseCase } from '@use-cases/book-hotel-booking';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { logger } from '@shared';
import middy from '@middy/core';

const tracer = new Tracer();
const metrics = new Metrics();

const bookHotelBookingAdapter: Handler<BookHotelBooking, HttpResponse> = async (
  body: BookHotelBooking
): Promise<HttpResponse> => {
  try {
    if (!body) throw new ValidationError('no payload body');

    const created = await bookHotelBookingUseCase(body);

    metrics.addMetric('SuccessfulBookHotelBooking', MetricUnit.Count, 1);

    return {
      statusCode: 201,
      body: created,
    };
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) errorMessage = error.message;
    logger.error(errorMessage);

    metrics.addMetric('BookHotelBookingError', MetricUnit.Count, 1);

    return {
      statusCode: 500,
      body: { response: 'An error has occured' },
    };
  }
};

export const handler = middy(bookHotelBookingAdapter)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics));
