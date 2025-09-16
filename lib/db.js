// This is a server-side only module that handles database operations
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, access, constants, readFile, writeFile } from 'fs/promises';

let db;

// Default data structure
const defaultData = {
  users: [],
  tasks: [],
  categories: []
};

// Initialize database
let dbInitialized = false;

export async function initDB() {
  if (dbInitialized || typeof window !== 'undefined') return;
  
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const dataDir = join(process.cwd(), 'data');
    const file = join(dataDir, 'db.json');
    
    console.log('Initializing database at:', file);
    
    // Ensure data directory exists
    try {
      await access(dataDir, constants.F_OK);
    } catch (error) {
      console.log('Creating data directory:', dataDir);
      await mkdir(dataDir, { recursive: true });
    }
    
    // Check if file exists, if not create it with default data
    try {
      await access(file, constants.F_OK);
    } catch (error) {
      console.log('Creating new database file with default data');
      await writeFile(file, JSON.stringify(defaultData, null, 2), 'utf8');
    }
    
    // Initialize database
    const adapter = new JSONFile(file);
    db = new Low(adapter, { ...defaultData });
    
    // Read existing data
    await db.read();
    
    // Ensure all default collections exist
    db.data ||= { ...defaultData };
    Object.keys(defaultData).forEach(key => {
      if (!db.data[key]) {
        db.data[key] = [];
      }
    });
    
    await db.write();
    
    console.log('Database initialized with:', {
      users: db.data.users?.length || 0,
      tasks: db.data.tasks?.length || 0,
      categories: db.data.categories?.length || 0
    });
    
    dbInitialized = true;
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error('Database initialization failed: ' + error.message);
  }
}

// Initialize the database when this module is imported
if (typeof window === 'undefined') {
  initDB().catch(console.error);
}

export async function readDB() {
  if (!db) {
    console.warn('Database not initialized - attempting to initialize');
    try {
      await initDB();
    } catch (error) {
      console.error('Failed to initialize database in readDB:', error);
      return { users: [], tasks: [], categories: [] };
    }
  }
  
  try {
    await db.read();
    db.data = db.data || { users: [], tasks: [], categories: [] };
    return db.data;
  } catch (error) {
    console.error('Database read error:', error);
    return { users: [], tasks: [], categories: [] };
  }
}

export async function writeDB(newData) {
  if (!db) {
    console.warn('Database not initialized - attempting to initialize');
    try {
      await initDB();
    } catch (error) {
      console.error('Failed to initialize database in writeDB:', error);
      return false;
    }
  }
  
  try {
    db.data = newData;
    await db.write();
    return true;
  } catch (error) {
    console.error('Database write error:', error);
    throw new Error('Failed to update database: ' + error.message);
  }
}

// Helper function to find user by email
export async function findUserByEmail(email) {
  try {
    if (!email) return null;
    const normalizedEmail = email.toLowerCase().trim();
    const db = await readDB();
    return db.users.find(user => user.email.toLowerCase() === normalizedEmail) || null;
  } catch (error) {
    console.error('Error in findUserByEmail:', error);
    return null;
  }
}

// Helper function to add new user
export async function createUser(userData) {
  const dbData = await readDB();
  
  // Normalize email
  const normalizedEmail = userData.email.toLowerCase().trim();
  
  // Check if user already exists (case-insensitive check)
  if (dbData.users.some(user => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error('User with this email already exists');
  }
  
  const newUser = {
    id: Date.now().toString(),
    ...userData,
    email: normalizedEmail, // Store normalized email
    createdAt: new Date().toISOString()
  };
  
  // Add new user and save
  dbData.users.push(newUser);
  await writeDB(dbData);
  
  return newUser;
}