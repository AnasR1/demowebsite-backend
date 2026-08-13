import { ObjectId } from 'mongodb';

export function toObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch (err) {
    console.error(`Invalid ObjectId: ${id}`);
    return null;
  }
}