import type { FastifyInstance } from 'fastify';
import { listingsCollection } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { toObjectId } from '../utils/objectId.js';
import { randomUUID } from 'crypto';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

const hardcodedListings = [
  { id: 1, name: 'Stock A', price: 120.5 },
  { id: 2, name: 'Stock B', price: 75.25 },
  { id: 3, name: 'Stock C', price: 300.0 },
];

export default async function listingRoutes(fastify: FastifyInstance) {
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
    const { id: idParam } = request.params as { id: string };
    const id = toObjectId(idParam);
    if (!id) {
      reply.status(400).send({ error: 'Invalid ID format' });
      return;
    }
    const listing = await listingsCollection?.findOne({ _id: id });
    if (!listing) {
      reply.status(404).send({ error: 'Listing not found' });
      return;
    }
    return listing;
  });

    fastify.post('/listings', { preHandler: requireAuth }, async (request, reply) => {
    let name: string | undefined;
    let description = '';
    let priceRaw: string | undefined;
    let imagePath: string | undefined;

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (part.filename) {
          const ext = path.extname(part.filename);
          const filename = `${randomUUID()}${ext}`;
          await pipeline(part.file, createWriteStream(path.join(process.cwd(), 'uploads', filename)));
          imagePath = `/uploads/${filename}`;
        } else {
          part.file.resume();
        }
      } else {
        if (part.fieldname === 'name') name = String(part.value);
        if (part.fieldname === 'description') description = String(part.value);
        if (part.fieldname === 'price') priceRaw = String(part.value);
      }
    }

    const price = priceRaw !== undefined ? Number(priceRaw) : undefined;
    if (!name || typeof price !== 'number' || Number.isNaN(price)) {
      reply.status(400).send({ error: 'Name and price are required' });
      return;
    }

    const doc = {
      name,
      description,
      price,
      ...(imagePath ? { image: imagePath } : {}),
      createdAt: new Date(),
    };
    const result = await listingsCollection?.insertOne(doc);
    return reply.code(201).send({ _id: result?.insertedId, ...doc });
  });
  
  fastify.put('/listings/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id: idParam } = request.params as { id: string };
    const id = toObjectId(idParam);
    if (!id) {
      reply.status(400).send({ error: 'Invalid ID format' });
      return;
    }

    let name: string | undefined;
    let description: string | undefined;
    let priceRaw: string | undefined;
    let imagePath: string | undefined;

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (part.filename) {
          const ext = path.extname(part.filename);
          const filename = `${randomUUID()}${ext}`;
          await pipeline(part.file, createWriteStream(path.join(process.cwd(), 'uploads', filename)));
          imagePath = `/uploads/${filename}`;
        } else {
          part.file.resume();
        }
      } else {
        if (part.fieldname === 'name') name = String(part.value);
        if (part.fieldname === 'description') description = String(part.value);
        if (part.fieldname === 'price') priceRaw = String(part.value);
      }
    }

    const price = priceRaw !== undefined ? Number(priceRaw) : undefined;
    const updateDoc: { name?: string; description?: string; price?: number; image?: string } = {};
    if (name) updateDoc.name = name;
    if (description) updateDoc.description = description;
    if (typeof price === 'number' && !Number.isNaN(price)) updateDoc.price = price;
    if (imagePath) updateDoc.image = imagePath;

    const result = await listingsCollection?.findOneAndUpdate(
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

  fastify.delete('/listings/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id: idParam } = request.params as { id: string };
    const id = toObjectId(idParam);
    if (!id) {
      reply.status(400).send({ error: 'Invalid ID format' });
      return;
    }

    const result = await listingsCollection?.deleteOne({ _id: id });
    if (!result || result.deletedCount === 0) {
      reply.status(404).send({ error: 'Listing not found' });
      return;
    }
    return { message: 'Listing deleted successfully' };
  });
}