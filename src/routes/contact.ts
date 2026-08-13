import type { FastifyInstance } from 'fastify';
import { contactCollection } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { toObjectId } from '../utils/objectId.js';

export default async function contactRoutes(fastify: FastifyInstance) {
  fastify.post('/contact', async (request, reply) => {
    const { name, email, message } = (request.body || {}) as {
      name?: string;
      email?: string;
      message?: string;
    };
    if (!name || !email || !message) {
      reply.status(400).send({ error: 'Name, email, and message are required' });
      return;
    }

    const doc = { name, email, message, createdAt: new Date() };
    const result = await contactCollection?.insertOne(doc);
    return reply.code(201).send({ _id: result?.insertedId, ...doc });
  });

  fastify.get('/admin/contact', { preHandler: requireAuth }, async (request, reply) => {
    const submissions = await contactCollection?.find({}).sort({ createdAt: -1 }).toArray();
    return submissions;
  });

  fastify.delete('/admin/contact/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id: idParam } = request.params as { id: string };
    const id = toObjectId(idParam);
    if (!id) {
      reply.status(400).send({ error: 'Invalid ID format' });
      return;
    }

    const result = await contactCollection?.deleteOne({ _id: id });
    if (!result || result.deletedCount === 0) {
      reply.status(404).send({ error: 'Submission not found' });
      return;
    }
    return { message: 'Submission deleted successfully' };
  });
}