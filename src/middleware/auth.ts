import { type FastifyRequest, type FastifyReply, fastify } from 'fastify';
import '@fastify/cookie';
import { sessionsCollection, usersCollection } from '../db.js';
import type { User } from '../types.js';

export async function getSessionUser(request: FastifyRequest): Promise<User | null> {
  const sessionId = request.cookies.sessionId;
  if (!sessionId) return null;

  const session = await sessionsCollection?.findOne({ _id: sessionId });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await sessionsCollection?.deleteOne({ _id: sessionId });
    return null;
  }

  const user = await usersCollection?.findOne({ _id: session.userId });
  return user || null;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const user = await getSessionUser(request);
  if (!user) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
  request.user = user;
}