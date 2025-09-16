import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  const result = {
    success: false,
    checks: {
      directoryExists: false,
      fileExists: false,
      fileWritable: false,
      dbReadable: false,
      dbWritable: false,
      error: null
    },
    data: null
  };

  try {
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    
    // Check if directory exists
    try {
      await fs.access(path.dirname(dbPath));
      result.checks.directoryExists = true;
    } catch (error) {
      result.checks.error = 'Data directory does not exist';
      return NextResponse.json(result, { status: 500 });
    }

    // Check if file exists and is writable
    try {
      await fs.access(dbPath);
      result.checks.fileExists = true;
      
      // Test write access
      try {
        const stats = await fs.stat(dbPath);
        await fs.chmod(dbPath, 0o666); // Ensure write permissions
        result.checks.fileWritable = true;
      } catch (writeError) {
        result.checks.error = 'File exists but is not writable';
        return NextResponse.json(result, { status: 500 });
      }
    } catch (error) {
      // File doesn't exist, try to create it
      try {
        await fs.writeFile(dbPath, JSON.stringify({ users: [], tasks: [] }, null, 2));
        result.checks.fileExists = true;
        result.checks.fileWritable = true;
      } catch (createError) {
        result.checks.error = 'Failed to create database file';
        return NextResponse.json(result, { status: 500 });
      }
    }

    // Test database read
    try {
      const db = await readDB();
      result.checks.dbReadable = true;
      result.data = {
        users: db.data.users || [],
        tasks: db.data.tasks || []
      };
      
      // Test database write
      try {
        db.data.test = { timestamp: new Date().toISOString() };
        await db.write();
        result.checks.dbWritable = true;
        delete db.data.test; // Clean up test data
        await db.write();
      } catch (writeError) {
        result.checks.error = 'Database read succeeded but write failed';
        return NextResponse.json(result, { status: 500 });
      }
      
      result.success = true;
      return NextResponse.json(result);
      
    } catch (dbError) {
      result.checks.error = 'Failed to read from database';
      console.error('Database read error:', dbError);
      return NextResponse.json(result, { status: 500 });
    }
    
  } catch (error) {
    console.error('Test DB error:', error);
    result.checks.error = 'Unexpected error during database test';
    return NextResponse.json(
      result,
      { status: 500 }
    );
  }
}
