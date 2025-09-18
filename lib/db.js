
import { MongoClient, ObjectId } from 'mongodb';

let client;
let db;


export async function initDB() {
  if (client && client.topology?.isConnected()) {
    return db;
  }

  try {
    client = await MongoClient.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = client.db(process.env.MONGODB_DB || 'task-manager');
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw new Error('Database connection failed');
  }
}


export async function getTaskById(taskId, userId) {
  const db = await initDB();
  const task = await db.collection('tasks').findOne({
    _id: new ObjectId(taskId),
    userId: userId, 
  });

  if (!task) {
    throw new Error('Task not found or access denied');
  }

  return task;
}


export async function updateTask(taskId, userId, updateData) {
  const db = await initDB();
  const result = await db.collection('tasks').findOneAndUpdate(
    {
      _id: new ObjectId(taskId),
      userId: userId, 
    },
    { $set: updateData },
    { returnDocument: 'after' }
  );

  if (!result.value) {
    throw new Error('Task not found or access denied');
  }

  return result.value;
}


export async function deleteTask(taskId, userId) {
  const db = await initDB();
  const result = await db.collection('tasks').deleteOne({
    _id: new ObjectId(taskId),
    userId: userId, 
  });

  if (result.deletedCount === 0) {
    throw new Error('Task not found or access denied');
  }

  return true;
}