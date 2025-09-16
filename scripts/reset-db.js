import { writeFile } from 'fs/promises';
import { join } from 'path';
import bcrypt from 'bcryptjs';

async function resetDB() {
  try {
    const dataDir = join(process.cwd(), 'data');
    const file = join(dataDir, 'db.json');
    
    // Create a test user with hashed password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const defaultData = {
      users: [
        {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          createdAt: new Date().toISOString()
        }
      ],
      tasks: [],
      categories: []
    };
    
    await writeFile(file, JSON.stringify(defaultData, null, 2));
    console.log('Database reset successfully!');
    console.log('Test user credentials:');
    console.log('Email: test@example.com');
    console.log('Password: password123');
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDB();
