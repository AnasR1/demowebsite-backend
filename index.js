import Fastify from 'fastify';
import { MongoClient, ObjectId } from 'mongodb';
import cookie from '@fastify/cookie';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const fastify = Fastify({ logger: true });

await fastify.register(cookie);

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017';
const client = new MongoClient(MONGO_URL);

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

function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch (err) {
    console.error(`Invalid ObjectId: ${id}`);
    return null;
  } 
};

const hardcodedListings = [
  { id: 1, name: "Stock A", price: 120.50 },
  { id: 2, name: "Stock B", price: 75.25 },
  { id: 3, name: "Stock C", price: 300.00 }
];

const session_Duration = 1000 * 60 * 60 * 24; // 1 day in milliseconds

async function getSessionUser(request) {
  const sessionId = request.cookies.sessionId;
  if (!sessionId) return null;
  
  const session = await sessionsCollection.findOne({ _id: sessionId });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await sessionsCollection.deleteOne({ _id: sessionId });
    return null;
  }
  
  const user = await usersCollection.findOne({ _id: session.userId });
  return user || null;
};

async function requireAuth(request, reply) {
  const user = await getSessionUser(request);
  if (!user) {
    reply.status(401).send({ error: 'Unauthorized' });
    return null;
  }
  request.user = user;
};

let listingsCollection = null;
let contactCollection = null;
let usersCollection = null;
let sessionsCollection = null;

fastify.post('/auth/login', async (request, reply) => {
  const { username, password } = request.body || {};
  if (!username || !password) {
    reply.status(400).send({ error: 'Username and password are required' });
    return;
  }

  const user = await usersCollection.findOne({ username });
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

  await sessionsCollection.insertOne({
    _id: sessionId,
    userId: user._id,
    expiresAt,
  });

  reply.setCookie('sessionId', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    expires: expiresAt,
  });

  return { username: user.username };
});

fastify.post('/auth/logout', async (request, reply) => {
  const sessionId = request.cookies.sessionId;
  if (sessionId) {
    await sessionsCollection.deleteOne({ _id: sessionId });
  }
  reply.clearCookie('sessionId', { path: '/' });
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

fastify.get('/listings', async (request, reply) => {
  if (!listingsCollection) {
    console.log('Using hardcoded fallback - no DB connection');
    return hardcodedListings;
  }
  const listings = await listingsCollection.find({}).toArray();
  console.log(`Fetched ${listings.length} listings from MongoDB`);
  if (listings.length === 0) return hardcodedListings;
  return listings;
});

fastify.get('/listings/:id', async (request, reply) => {
  const id = toObjectId(request.params.id);
  if (!id) {
    reply.status(400).send({ error: 'Invalid ID format' });
    return;
  }
  const listing = await listingsCollection.findOne({ _id: id });
  if (!listing) {
    reply.status(404).send({ error: 'Listing not found' });
    return;
  }
  return listing;
});

fastify.post('/listings', {preHandler: requireAuth} , async (request, reply) => {
  const {name, description, price} = request.body || {};
  if (!name || typeof price !== 'number') {
    reply.status(400).send({ error: 'Name and price are required' });
    return;
  }

  const doc = { name, 
    description: description || '', 
    price,
    createdAt: new Date() 
  };

  const result = await listingsCollection.insertOne(doc);
  return reply.code(201).send({_id: result.insertedId, ...doc });
});

fastify.put('/listings/:id', {preHandler: requireAuth}, async (request, reply) => {
  const id = toObjectId(request.params.id);
  if (!id) {
    reply.status(400).send({ error: 'Invalid ID format' });
    return;
  }

  const {name, description, price} = request.body || {};
  const updateDoc = {};
  if (name) updateDoc.name = name;
  if (description) updateDoc.description = description;
  if (typeof price === 'number') updateDoc.price = price;

  const result = await listingsCollection.findOneAndUpdate(
    { _id: id },
    { $set: updateDoc },
    { returnDocument: 'after' }
  );

  if (!result) {
    reply.status(404).send({ error: 'Listing not found' });
    return;
  }
  return result;
});

fastify.delete('/listings/:id', {preHandler: requireAuth} , async (request, reply) => {
  const id = toObjectId(request.params.id);
  if (!id) {
    reply.status(400).send({ error: 'Invalid ID format' });
    return;
  }

  const result = await listingsCollection.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    reply.status(404).send({ error: 'Listing not found' });
    return;
  }
  return { message: 'Listing deleted successfully' };
});

fastify.post('/contact', async (request, reply) => {
  const { name, email, message } = request.body || {};
  if (!name || !email || !message) {
    reply.status(400).send({ error: 'Name, email, and message are required' });
    return;
  }

  const doc = { name, email, message, createdAt: new Date() };
  const result = await contactCollection.insertOne(doc);
  return reply.code(201).send({ _id: result.insertedId, ...doc });
});

fastify.get('/admin/contact', {preHandler: requireAuth}, async (request, reply) => {
  const submissions = await contactCollection.find({}).sort({ createdAt: -1 }).toArray();
  return submissions;
});

fastify.delete('/admin/contact/:id', {preHandler: requireAuth}, async (request, reply) => {
  const id = toObjectId(request.params.id);
  if (!id) {
    reply.status(400).send({ error: 'Invalid ID format' });
    return;
  }

  const result = await contactCollection.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    reply.status(404).send({ error: 'Submission not found' });
    return;
  }
  return { message: 'Submission deleted successfully' };
});

const start = async () => {
  try {
    await client.connect();
    const db = client.db('demowebsite');
    listingsCollection = db.collection('listings');
    contactCollection = db.collection('contacts');
    usersCollection = db.collection('users');
    sessionsCollection = db.collection('sessions');
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }

  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();