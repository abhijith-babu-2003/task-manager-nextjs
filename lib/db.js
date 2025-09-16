import mongoose from 'mongoose';

// Connection state
let isConnected = false;

/**
 * Initialize MongoDB connection
 */
export async function initDB() {
  // Skip if already connected or in browser
  if (isConnected || typeof window !== 'undefined') {
    return;
  }

  try {
    // Check if environment variables are set
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('Attempting to connect to MongoDB...');
    console.log('Connection string starts with:', process.env.MONGODB_URI.substring(0, 20) + '...');

    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      isConnected = true;
      return;
    }

    // Add database name to the URI if not present
    let mongoUri = process.env.MONGODB_URI;
    if (!mongoUri.includes('?')) {
      mongoUri += '/taskmanager'; // Add default database name
    } else if (!mongoUri.match(/\/[^/?]+\?/)) {
      mongoUri = mongoUri.replace('/?', '/taskmanager?');
    }

    console.log('Using MongoDB URI with database name');

    // Connect to MongoDB
    const connection = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      bufferCommands: false,
      bufferMaxEntries: 0,
    });

    isConnected = true;
    console.log('MongoDB connected successfully to:', connection.connection.name);
    
    // Add connection event listeners
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });

    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    isConnected = false;
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
}

// User operations with error handling
export async function findUserById(id) {
  try {
    if (!id) {
      console.log('findUserById: No ID provided');
      return null;
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('findUserById: Invalid ObjectId format:', id);
      return null;
    }

    await initDB();
    
    // Import User model here to avoid circular imports
    const User = (await import('../models/User')).default;
    const user = await User.findById(id).lean();
    
    console.log('findUserById: Found user:', user ? user.email : 'not found');
    return user;
  } catch (error) {
    console.error('Error in findUserById:', error);
    return null;
  }
}

export async function findUserByEmail(email) {
  try {
    if (!email) {
      console.log('findUserByEmail: No email provided');
      return null;
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    await initDB();
    
    // Import User model here to avoid circular imports
    const User = (await import('../models/User')).default;
    const user = await User.findOne({ email: normalizedEmail }).lean();
    
    console.log('findUserByEmail: Found user:', user ? user.email : 'not found');
    return user;
  } catch (error) {
    console.error('Error in findUserByEmail:', error);
    return null;
  }
}

export async function createUser(userData) {
  try {
    await initDB();
    
    // Check if user already exists
    const existingUser = await findUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Import User model here to avoid circular imports
    const User = (await import('../models/User')).default;
    
    const user = new User({
      name: userData.name,
      email: userData.email.toLowerCase().trim(),
      password: userData.password
    });

    await user.save();
    console.log('createUser: User created successfully:', user.email);
    return user.toObject();
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

// Task operations with error handling
export async function getTaskById(taskId, userId) {
  try {
    if (!taskId || !userId) {
      console.log('getTaskById: Missing taskId or userId');
      return null;
    }
    
    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('getTaskById: Invalid ObjectId format');
      return null;
    }

    await initDB();
    
    // Import Task model here to avoid circular imports
    const Task = (await import('../models/Task')).default;
    const task = await Task.findOne({ 
      _id: taskId, 
      userId: new mongoose.Types.ObjectId(userId)
    }).lean();
    
    console.log('getTaskById: Found task:', task ? task.title : 'not found');
    return task;
  } catch (error) {
    console.error('Error in getTaskById:', error);
    return null;
  }
}

export async function createTask(taskData) {
  try {
    await initDB();
    
    // Import Task model here to avoid circular imports
    const Task = (await import('../models/Task')).default;
    
    const task = new Task({
      ...taskData,
      userId: new mongoose.Types.ObjectId(taskData.userId)
    });
    
    await task.save();
    console.log('createTask: Task created successfully:', task.title);
    return task.toObject();
  } catch (error) {
    console.error('Error in createTask:', error);
    throw error;
  }
}

export async function getTasksByUser(userId, filters = {}) {
  try {
    if (!userId) {
      console.log('getTasksByUser: No userId provided');
      return [];
    }
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('getTasksByUser: Invalid userId format');
      return [];
    }

    await initDB();
    
    // Import Task model here to avoid circular imports
    const Task = (await import('../models/Task')).default;
    
    const query = { userId: new mongoose.Types.ObjectId(userId) };
    
    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(query).sort({ createdAt: -1 }).lean();
    console.log('getTasksByUser: Found', tasks.length, 'tasks');
    return tasks;
  } catch (error) {
    console.error('Error in getTasksByUser:', error);
    return [];
  }
}

export async function updateTask(taskId, userId, updateData) {
  try {
    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid taskId or userId format');
    }

    await initDB();
    
    // Import Task model here to avoid circular imports
    const Task = (await import('../models/Task')).default;
    
    const task = await Task.findOneAndUpdate(
      { 
        _id: taskId, 
        userId: new mongoose.Types.ObjectId(userId)
      },
      { $set: { ...updateData, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!task) {
      throw new Error('Task not found or access denied');
    }

    console.log('updateTask: Task updated successfully:', task.title);
    return task;
  } catch (error) {
    console.error('Error in updateTask:', error);
    throw error;
  }
}

export async function deleteTask(taskId, userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid taskId or userId format');
    }

    await initDB();
    
    // Import Task model here to avoid circular imports
    const Task = (await import('../models/Task')).default;
    
    const result = await Task.deleteOne({ 
      _id: taskId, 
      userId: new mongoose.Types.ObjectId(userId)
    });
    
    if (result.deletedCount === 0) {
      throw new Error('Task not found or access denied');
    }
    
    console.log('deleteTask: Task deleted successfully');
    return true;
  } catch (error) {
    console.error('Error in deleteTask:', error);
    throw error;
  }
}

// Test the connection
export async function testConnection() {
  try {
    await initDB();
    console.log('Database connection test: SUCCESS');
    return true;
  } catch (error) {
    console.error('Database connection test: FAILED', error.message);
    return false;
  }
}