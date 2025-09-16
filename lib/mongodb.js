import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set. Please add it to your .env.local file');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10, 
  serverSelectionTimeoutMS: 5000, 
  socketTimeoutMS: 45000, 
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
    console.log('Created new MongoDB connection');
  }
  clientPromise = global._mongoClientPromise;
} else {

  client = new MongoClient(uri, options);
  clientPromise = client.connect();
  console.log('Created new MongoDB connection (production)');
}

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db();
}

export async function getCollection(collectionName) {
  const db = await getDb();
  return db.collection(collectionName);
}


async function testConnection() {
  try {
    const client = await clientPromise;
    await client.db().command({ ping: 1 });
    console.log('Successfully connected to MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}


if (process.env.NODE_ENV === 'development') {
  testConnection().catch(console.error);
}
