import { NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask, initDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth-utils';
import { ObjectId } from 'mongodb';

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
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    
    if (userId && userEmail) {
      return { id: userId, email: userEmail };
    }
    
    // Fallback to token verification
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      console.log('No auth token found in cookies');
      return null;
    }
    
    const decoded = await verifyToken(token);
    
    if (!decoded || !decoded.id) {
      console.log('Invalid or expired token');
      return null;
    }
    
    // No second DB query needed; return merged data (just id/email for tasks)
    return { 
      id: decoded.id, 
      email: decoded.email 
    };
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
    await initDB();
    
    const user = await getAuthenticatedUser(request);
    if (!user) {
      const response = NextResponse.json(
        { error: 'Unauthorized - Authentication required' }, 
        { status: 401 }
      );
      return withCors(response, request);
    }

    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      const response = NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
      return withCors(response, request);
    }

    const task = await getTaskById(id, user.id);

    if (!task) {
      const response = NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      );
      return withCors(response, request);
    }

    const response = NextResponse.json({ task });
    return withCors(response, request);
  } catch (error) {
    console.error('Error getting task:', error);
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
    await initDB();
    
    const user = await getAuthenticatedUser(request);
    if (!user) {
      const response = NextResponse.json(
        { error: 'Unauthorized - Authentication required' }, 
        { status: 401 }
      );
      return withCors(response, request);
    }

    const { id } = params;
    const updateData = await request.json();
    
    if (!ObjectId.isValid(id)) {
      const response = NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
      return withCors(response, request);
    }

    try {
      const updatedTask = await updateTask(id, user.id, updateData);
      
      const response = NextResponse.json({ 
        task: updatedTask,
        message: 'Task updated successfully' 
      });
      return withCors(response, request);
    } catch (error) {
      if (error.message === 'Task not found or access denied') {
        const response = NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
        return withCors(response, request);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating task:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    );
    return withCors(response, request);
  }
}

// Delete task
export async function DELETE(request, { params }) {
  try {
    await initDB();
    
    const user = await getAuthenticatedUser(request);
    if (!user) {
      const response = NextResponse.json(
        { error: 'Unauthorized - Authentication required' }, 
        { status: 401 }
      );
      return withCors(response, request);
    }

    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      const response = NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
      return withCors(response, request);
    }

    try {
      await deleteTask(id, user.id);
      
      const response = NextResponse.json({ 
        message: 'Task deleted successfully' 
      });
      return withCors(response, request);
    } catch (error) {
      if (error.message === 'Task not found or access denied') {
        const response = NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
        return withCors(response, request);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
    return withCors(response, request);
  }
}