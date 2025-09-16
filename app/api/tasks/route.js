import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import { verifyToken } from '@/lib/auth-utils';

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
    
    return { 
      id: decoded.id, 
      email: decoded.email 
    };
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    return null;
  }
}

// Handle preflight requests (middleware covers)
export async function OPTIONS(request) {
  const response = new NextResponse(null, { status: 200 });
  return response;
}

// Get all tasks for the current user
export async function GET(request) {
  try {
    await dbConnect();
    
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      console.log('No authenticated user found in GET request');
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' }, 
        { status: 401 }
      );
    }
    
    console.log('Fetching tasks for user:', user.email || 'unknown');

    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status'),
      priority: searchParams.get('priority'),
      category: searchParams.get('category'),
      search: searchParams.get('search')
    };

    // Get tasks with filters using the Task model (already lean() in static)
    const tasks = await Task.findByUser(user.id, filters);
    
    // Transform tasks to include proper ID field and ensure consistency
    const transformedTasks = tasks.map(task => ({
      id: task._id.toString(),
      _id: task._id.toString(),
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      category: task.category || '',
      tags: task.tags || [],
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      timeSpent: task.timeSpent || 0,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      userId: task.userId.toString()
    }));

    return NextResponse.json(transformedTasks);
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch tasks',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Create new task
export async function POST(request) {
  try {
    console.log('POST /api/tasks - Request received');
    await dbConnect();
    
    const user = await getAuthenticatedUser(request);
    if (!user) {
      console.log('POST /api/tasks - Unauthorized: No user found');
      return NextResponse.json(
        { 
          error: 'Unauthorized - Authentication required'
        },
        { status: 401 }
      );
    }

    const taskData = await request.json();
    console.log('POST /api/tasks - Task data:', taskData);
    
    // Validate required fields
    if (!taskData.title || !taskData.title.trim()) {
      console.log('POST /api/tasks - Validation error: Title is required');
      return NextResponse.json(
        { 
          error: 'Title is required'
        },
        { status: 400 }
      );
    }

    // Create new task using the Task model
    const newTask = new Task({
      title: taskData.title.trim(),
      description: taskData.description?.trim() || '',
      status: taskData.status || 'pending',
      priority: taskData.priority || 'medium',
      category: taskData.category?.trim() || '',
      tags: Array.isArray(taskData.tags) ? taskData.tags.filter(tag => tag.trim()) : [],
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      timeSpent: taskData.timeSpent || 0,
      userId: user.id
    });

    await newTask.save();

    // Transform the saved task for response
    const responseTask = {
      id: newTask._id.toString(),
      _id: newTask._id.toString(),
      title: newTask.title,
      description: newTask.description,
      status: newTask.status,
      priority: newTask.priority,
      category: newTask.category,
      tags: newTask.tags,
      dueDate: newTask.dueDate,
      completedAt: newTask.completedAt,
      timeSpent: newTask.timeSpent,
      createdAt: newTask.createdAt,
      updatedAt: newTask.updatedAt,
      userId: newTask.userId.toString()
    };

    console.log(`POST /api/tasks - Task created with ID: ${newTask._id}`);
    
    return NextResponse.json(responseTask, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create task',
        details: error.message 
      },
      { status: 500 }
    );
  }
}