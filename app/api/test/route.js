import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db';

export async function GET() {
  try {
    const db = await readDB();
    
    // Ensure the database has the correct structure
    if (!db.data) {
      db.data = { users: [], tasks: [] };
      await db.write();
    }
    
    return NextResponse.json({
      success: true,
      data: {
        usersCount: db.data.users?.length || 0,
        tasksCount: db.data.tasks?.length || 0,
        dbPath: process.cwd() + '/data/db.json'
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
