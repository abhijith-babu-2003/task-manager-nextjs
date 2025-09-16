import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth-utils';
import { nanoid } from 'nanoid';

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

// Get all tasks for the current user
export async function GET(request) {
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
    
    console.log('Fetching tasks for user:', user.email || 'unknown');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const sortBy = searchParams.get('sortBy') || 'dueDate';
    const order = searchParams.get('order') || 'asc';

    const dbData = await readDB();
    if (!dbData || !dbData.tasks) {
      console.log('No tasks found in database');
      const response = NextResponse.json([], { status: 200 });
      return withCors(response, request);
    }
    
    // Filter tasks by current user
    let tasks = dbData.tasks.filter(task => task.userId === user.id);
    console.log(`Found ${tasks.length} tasks for user ${user.email}`);

    // Apply filters
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }
    if (category) {
      tasks = tasks.filter(task => task.category === category);
    }
    if (priority) {
      tasks = tasks.filter(task => task.priority === priority);
    }

    // Sort tasks
    tasks.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return order === 'asc' 
          ? new Date(a.dueDate) - new Date(b.dueDate)
          : new Date(b.dueDate) - new Date(a.dueDate);
      } else if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return order === 'asc'
          ? priorityOrder[a.priority] - priorityOrder[b.priority]
          : priorityOrder[b.priority] - priorityOrder[a.priority];
      } else {
        return order === 'asc'
          ? a[sortBy]?.localeCompare(b[sortBy])
          : b[sortBy]?.localeCompare(a[sortBy]);
      }
    });

    const response = NextResponse.json(tasks);
    return withCors(response, request);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
    return withCors(response, request);
  }
}

// Create new task
export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      console.log('No authenticated user found in POST request');
      const response = NextResponse.json(
        { error: 'Unauthorized - Authentication required' }, 
        { status: 401 }
      );
      return withCors(response, request);
    }
    
    console.log('Creating task for user:', user.email || 'unknown');

    const body = await request.json();
    console.log('Request body:', body);

    if (!body.title) {
      const response = NextResponse.json(
        { error: 'Title is required' }, 
        { status: 400 }
      );
      return withCors(response, request);
    }

    const dbData = await readDB();

    const newTask = {
      id: nanoid(),
      userId: user.id,
      title: body.title,
      description: body.description || '',
      category: body.category || 'Other',
      dueDate: body.dueDate || null,
      priority: ['low', 'medium', 'high'].includes(body.priority)
        ? body.priority
        : 'medium',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to tasks array
    dbData.tasks = dbData.tasks || [];
    dbData.tasks.push(newTask);
    
    // Write back to database
    await writeDB(dbData);
    
    console.log('Task created successfully:', newTask.id);

    const response = NextResponse.json(newTask, { status: 201 });
    return withCors(response, request);
  } catch (error) {
    console.error('Error creating task:', error);
    const response = NextResponse.json(
      { error: 'Failed to create task' }, 
      { status: 500 }
    );
    return withCors(response, request);
  }
}