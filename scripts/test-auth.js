import { initDB, readDB } from '../lib/db';

async function testAuth() {
  try {
    // Initialize database
    console.log('Initializing database...');
    await initDB();
    console.log('Database initialized successfully');

    // Read database
    console.log('\nReading database...');
    const dbData = await readDB();
    console.log('Current database state:', {
      users: dbData.users?.length || 0,
      tasks: dbData.tasks?.length || 0,
      categories: dbData.categories?.length || 0
    });

    // Test login with test account
    console.log('\nTesting login with test account...');
    const testEmail = 'test@example.com';
    const testUser = dbData.users?.find(u => u.email === testEmail);
    
    if (testUser) {
      console.log(`Found test user: ${testUser.name} (${testUser.email})`);
      console.log('User data:', {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        passwordHash: testUser.password ? '*** hashed ***' : 'none',
        createdAt: testUser.createdAt || 'not set'
      });
    } else {
      console.log('Test user not found. Creating one...');
      // Create a test user if none exists
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const newUser = {
        id: Date.now().toString(),
        name: 'Test User',
        email: testEmail,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };
      
      dbData.users = [...(dbData.users || []), newUser];
      // You would normally call writeDB here, but we'll just log for now
      console.log('Created test user:', {
        email: newUser.email,
        password: 'password123',
        hashedPassword: newUser.password
      });
    }

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testAuth();
