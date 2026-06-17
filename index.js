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

await client.connect();
const db = client.db('demowebsite');
const listingsCollection = db.collection('listings');

fastify.get('/listings', async (request, reply) => {
  const listings = await listingsCollection.find({}).toArray();
  if (listings.length === 0) return hardcodedListings;
  return listings;
});

fastify.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});