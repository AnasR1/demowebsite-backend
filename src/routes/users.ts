import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { usersCollection } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { toObjectId } from '../utils/objectId.js';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/admin/users', { preHandler: requireAuth }, async (request, reply) => {
    const users = await usersCollection
      ?.find({}, { projection: { passwordHash: 0 } })
      .toArray();
    return users;
  });

  fastify.post('/admin/users', { preHandler: requireAuth }, async (request, reply) => {
    const { username, password } = (request.body || {}) as { username?: string; password?: string };
    if (!username || !password) {
      reply.status(400).send({ error: 'Username and password are required' });
      return;
    }

    const existing = await usersCollection?.findOne({ username });
    if (existing) {
      reply.status(409).send({ error: 'Username already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const doc = { username, passwordHash, createdAt: new Date() };
    const result = await usersCollection?.insertOne(doc);

    return reply.code(201).send({ _id: result?.insertedId, username: doc.username, createdAt: doc.createdAt });
  });

  fastify.put('/admin/users/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id: idParam } = request.params as { id: string };
    const id = toObjectId(idParam);
    if (!id) {
      reply.status(400).send({ error: 'Invalid ID format' });
      return;
    }

    const { username, password } = (request.body || {}) as { username?: string; password?: string };
    const updateDoc: { username?: string; passwordHash?: string } = {};
    if (username) updateDoc.username = username;
    if (password) updateDoc.passwordHash = await bcrypt.hash(password, 10);

    if (Object.keys(updateDoc).length === 0) {
      reply.status(400).send({ error: 'Nothing to update' });
      return;
    }

    const result = await usersCollection?.findOneAndUpdate(
      { _id: id },
      { $set: updateDoc },
      { returnDocument: 'after', projection: { passwordHash: 0 } }
    );

    if (!result) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }
    return result;
  });

  fastify.delete('/admin/users/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id: idParam } = request.params as { id: string };
    const id = toObjectId(idParam);
    if (!id) {
      reply.status(400).send({ error: 'Invalid ID format' });
      return;
    }

    const totalUsers = await usersCollection?.countDocuments();
    if (totalUsers !== undefined && totalUsers <= 1) {
      reply.status(403).send({ error: 'Cannot delete the last remaining user' });
      return;
    }

    const result = await usersCollection?.deleteOne({ _id: id });
    if (!result || result.deletedCount === 0) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }
    return { message: 'User deleted successfully' };
  });
}