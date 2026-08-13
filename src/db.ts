import { MongoClient, type Collection } from 'mongodb';
import type { Listing, Contact, User, Session } from './types.js';
 
const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017';
export const client = new MongoClient(MONGO_URL);
 

export let listingsCollection: Collection<Listing> | null = null;
export let contactCollection: Collection<Contact> | null = null;
export let usersCollection: Collection<User> | null = null;
export let sessionsCollection: Collection<Session> | null = null;
 
export async function connectDB() {
  try {
    await client.connect();
    const db = client.db('demowebsite');
    listingsCollection = db.collection<Listing>('listings');
    contactCollection = db.collection<Contact>('contacts');
    usersCollection = db.collection<User>('users');
    sessionsCollection = db.collection<Session>('sessions');
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection failed:', (err as Error).message);
  }
}