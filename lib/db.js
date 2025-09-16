// lib/db.js
import { MongoClient, ObjectId } from 'mongodb';

let client;
let db;

// Initialize MongoDB connection
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

// Get a task by ID for a specific user
export async function getTaskById(taskId, userId) {
  const db = await initDB();
  const task = await db.collection('tasks').findOne({
    _id: new ObjectId(taskId),
    userId: userId, // Ensure task belongs to the user
  });

  if (!task) {
    throw new Error('Task not found or access denied');
  }

  return task;
}

// Update a task
export async function updateTask(taskId, userId, updateData) {
  const db = await initDB();
  const result = await db.collection('tasks').findOneAndUpdate(
    {
      _id: new ObjectId(taskId),
      userId: userId, // Ensure task belongs to the user
    },
    { $set: updateData },
    { returnDocument: 'after' }
  );

  if (!result.value) {
    throw new Error('Task not found or access denied');
  }

  return result.value;
}

// Delete a task
export async function deleteTask(taskId, userId) {
  const db = await initDB();
  const result = await db.collection('tasks').deleteOne({
    _id: new ObjectId(taskId),
    userId: userId, // Ensure task belongs to the user
  });

  if (result.deletedCount === 0) {
    throw new Error('Task not found or access denied');
  }

  return true;
}