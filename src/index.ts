import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import listingRoutes from './routes/listings.js';
import contactRoutes from './routes/contact.js';

const fastify = Fastify({ logger: true });

await fastify.register(cookie);

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://anasabdurrahman.com';

fastify.addHook('onRequest', async (request, reply) => {
  console.log(`Incoming request: ${request.method} ${request.url}`);
  reply.header('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');
  reply.header('Access-Control-Allow-Credentials', 'true');
  if (request.method === 'OPTIONS') {
    reply.status(204).send();
  }
});

await fastify.register(authRoutes);
await fastify.register(userRoutes);
await fastify.register(listingRoutes);
await fastify.register(contactRoutes);

const start = async () => {
  await connectDB();

  try {
    await fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();