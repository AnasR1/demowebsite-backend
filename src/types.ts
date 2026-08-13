import type { ObjectId } from 'mongodb';

export interface Listing {
  _id?: ObjectId;
  name: string;
  description: string;
  price: number;
  createdAt: Date;
}

export interface Contact {
  _id?: ObjectId;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
}

export interface User {
  _id?: ObjectId;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

export interface Session {
  _id: string;
  userId: ObjectId;
  expiresAt: Date;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}