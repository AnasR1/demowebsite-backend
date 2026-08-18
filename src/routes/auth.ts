import type { FastifyInstance } from 'fastify';
import '@fastify/cookie';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { usersCollection, sessionsCollection } from '../db.js';
import { getSessionUser } from '../middleware/auth.js';

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
const IS_PROD = 'production' === process.env.NODE_ENV;
const session_Duration = 1000 * 60 * 60 * 24; // 1 day in milliseconds

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/login', async (request, reply) => {
    const { username, password } = (request.body || {}) as { username?: string; password?: string };
    if (!username || !password) {
      reply.status(400).send({ error: 'Username and password are required' });
      return;
    }

    const user = await usersCollection?.findOne({ username });
    if (!user) {
      reply.status(401).send({ error: 'Invalid username or password' });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      reply.status(401).send({ error: 'Invalid username or password' });
      return;
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + session_Duration);

    await sessionsCollection?.insertOne({
      _id: sessionId,
      userId: user._id!,
      expiresAt,
    });

    reply.setCookie('sessionId', sessionId, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? 'none' : 'lax',
      path: '/',
      expires: expiresAt,
      ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    });

    return { username: user.username };
  });

  fastify.post('/auth/logout', async (request, reply) => {
    const sessionId = request.cookies.sessionId;
    if (sessionId) {
      await sessionsCollection?.deleteOne({ _id: sessionId });
    }
    reply.clearCookie('sessionId', {
      path: '/',
      ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    });
    return { message: 'Logged out' };
  });

  fastify.get('/auth/me', async (request, reply) => {
    const user = await getSessionUser(request);
    if (!user) {
      reply.status(401).send({ error: 'Not authenticated' });
      return;
    }
    return { username: user.username };
  });
}