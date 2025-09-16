import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth-utils';

// Helper function to set CORS headers
function withCors(response, request) {
  const origin = request.headers.get('origin') || '*';
  
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

// Helper function to get authenticated user
async function getAuthenticatedUser(request) {
  try {
    // First try to get user from middleware headers
    const userHeader = request.headers.get('x-user');
    if (userHeader) {
      try {
        return JSON.parse(userHeader);
      } catch (error) {
        console.error('Error parsing user header:', error);
      }
    }

    // Fallback to token verification
    const token = request.cookies.get('auth-token')?.value;
    console.log('Auth token from cookies:', token ? 'exists' : 'missing');
    
    if (!token) {
      console.log('No auth token found in cookies');
      return null;
    }
    
    const decoded = await verifyToken(token);
    console.log('Decoded token:', decoded);
    
    if (!decoded) {
      console.log('Invalid or expired token');
      return null;
    }
    
    const dbData = await readDB();
    const user = dbData.users?.find(user => user.id === decoded.id);
    
    if (!user) {
      console.log('User not found in database');
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    return null;
  }
}

// Handle preflight requests
export async function OPTIONS(request) {
  const response = new NextResponse(null, { status: 200 });
  return withCors(response, request);
}

// Get single task
export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      console.log('No authenticated user found in GET request');
      const response = NextResponse.json(
        { error: 'Unauthorized - Authentication required' }, 
        { status: 401 }
      );
      return withCors(response, request);
    }

    const dbData = await readDB();
    const task = dbData.tasks?.find(t => t.id === params.id && t.userId === user.id);
    
    if (!task) {
      const response = NextResponse.json(
        { error: 'Task not found' }, 
        { status: 404 }
      );
      return withCors(response, request);
    }
    
    const response = NextResponse.json(task);
    return withCors(response, request);
  } catch (error) {
    console.error('Error fetching task:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
    return withCors(response, request);
  }
}

// Update task
export async function PUT(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      console.log('No authenticated user found in PUT request');
      const response = NextResponse.json(
        { error: 'Unauthorized - Authentication required' }, 
        { status: 401 }
      );
      return withCors(response, request);
    }

    console.log('Updating task:', params.id, 'for user:', user.email);

    const body = await request.json();
    const dbData = await readDB();
    
    // Find task index - only allow updating user's own tasks
    const taskIndex = dbData.tasks?.findIndex(
      task => task.id === params.id && task.userId === user.id
    );

    if (taskIndex === -1 || taskIndex === undefined) {
      console.log('Task not found for update:', params.id);
      const response = NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
      return withCors(response, request);
    }

    // Update task
    const updatedTask = {
      ...dbData.tasks[taskIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    dbData.tasks[taskIndex] = updatedTask;
    await writeDB(dbData);

    console.log('Task updated successfully:', params.id);

    const response = NextResponse.json(updatedTask);
    return withCors(response, request);
  } catch (error) {
    console.error('Error updating task:', error);
    const response = NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
    return withCors(response, request);
  }
}

// Delete task
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      console.log('No authenticated user found in DELETE request');
      const response = NextResponse.json(
        { error: 'Unauthorized - Authentication required' }, 
        { status: 401 }
      );
      return withCors(response, request);
    }

    console.log('Deleting task:', params.id, 'for user:', user.email);

    const dbData = await readDB();
    const initialLength = dbData.tasks?.length || 0;
    
    // Remove task if it belongs to the user
    const taskIndex = dbData.tasks?.findIndex(
      task => task.id === params.id && task.userId === user.id
    );

    if (taskIndex === -1 || taskIndex === undefined) {
      console.log('Task not found for deletion:', params.id);
      const response = NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
      return withCors(response, request);
    }

    // Remove task
    dbData.tasks.splice(taskIndex, 1);
    await writeDB(dbData);

    console.log('Task deleted successfully:', params.id);

    const response = NextResponse.json({ success: true });
    return withCors(response, request);
  } catch (error) {
    console.error('Error deleting task:', error);
    const response = NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
    return withCors(response, request);
  }
}