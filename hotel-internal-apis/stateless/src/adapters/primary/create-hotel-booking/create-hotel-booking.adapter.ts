import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { errorHandler, logger } from '@shared';

import { HotelBooking } from '@dto/hotel-booking';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { ValidationError } from '@errors/validation-error';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { createHotelBookingUseCase } from '@use-cases/create-hotel-booking';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import middy from '@middy/core';

const tracer = new Tracer();
const metrics = new Metrics();

export const createHotelBookingAdapter = async ({
  body,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!body) throw new ValidationError('no payload body');

    const hotelBooking = JSON.parse(body) as HotelBooking;

    const created: HotelBooking = await createHotelBookingUseCase(hotelBooking);

    metrics.addMetric('SuccessfulCreateHotelBooking', MetricUnit.Count, 1);

    return {
      statusCode: 201,
      body: JSON.stringify(created),
    };
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) errorMessage = error.message;
    logger.error(errorMessage);

    metrics.addMetric('CreateHotelBookingError', MetricUnit.Count, 1);

    return errorHandler(error);
  }
};

export const handler = middy(createHotelBookingAdapter)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics));
