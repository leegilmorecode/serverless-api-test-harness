import fastify, { FastifyReply, FastifyRequest } from 'fastify';

import { getAndDeleteLastRecord } from '../secondary/database-adapter';
import { logger } from '@shared';

export const app = fastify({ logger: true });

// we respond with any method, resource, or path
app.all('/*', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // you can add an api key here to make this more secure

    const record = await getAndDeleteLastRecord();

    logger.debug(
      `response: ${JSON.stringify(record.response)}, statusCode: ${
        record.statusCode
      }`
    );

    return reply.status(record.statusCode).send(record.response);
  } catch (error) {
    reply.status(500).send('An error has occured');
  }
});
