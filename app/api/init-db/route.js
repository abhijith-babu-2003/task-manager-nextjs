import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'db.json');
const defaultData = {
  users: [],
  tasks: [],
  categories: []
};

export async function GET() {
  try {
    // Create data directory if it doesn't exist
    await mkdir(path.dirname(dbPath), { recursive: true });
    

    await writeFile(dbPath, JSON.stringify(defaultData, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully',
      path: dbPath
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize database',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
