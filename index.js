import Fastify from 'fastify';
import { MongoClient } from 'mongodb';

const fastify = Fastify({ logger: true });

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017';
const client = new MongoClient(MONGO_URL);

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