import Fastify from 'fastify';
import { MongoClient, ObjectId } from 'mongodb';

const fastify = Fastify({ logger: true });

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017';
const client = new MongoClient(MONGO_URL);

fastify.addHook('onRequest', async (request, reply) => {
  console.log(`Incoming request: ${request.method} ${request.url}`);
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');
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
}
const hardcodedListings = [
  { id: 1, name: "Stock A", price: 120.50 },
  { id: 2, name: "Stock B", price: 75.25 },
  { id: 3, name: "Stock C", price: 300.00 }
];

let listingsCollection = null;


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

fastify.post('/listings', async (request, reply) => {
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

fastify.put('/listings/:id', async (request, reply) => {
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

fastify.delete('/listings/:id', async (request, reply) => {
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

const start = async () => {
  try {
    await client.connect();
    const db = client.db('demowebsite');
    listingsCollection = db.collection('listings');
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