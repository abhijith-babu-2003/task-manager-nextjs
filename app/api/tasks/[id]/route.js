// app/api/tasks/[id]/route.js
import { NextResponse } from 'next/server';
import Task from '@/models/Task'; // Use model
import dbConnect from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth-utils';
import mongoose from 'mongoose'; // For ObjectId

const { Types: { ObjectId } } = mongoose;

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

    return { id: decoded.id, email: decoded.email };
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    return null;
  }
}

// Handle preflight requests (middleware covers, but keep for safety)
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}

// Get single task
export async function GET(request, { params }) {
  try {
    await dbConnect();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // Use Mongoose model for query
    const task = await Task.findOne({ 
      _id: new ObjectId(id), 
      userId: new ObjectId(user.id) 
    }).lean();

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error getting task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// Update task
export async function PUT(request, { params }) {
  try {
    await dbConnect();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;
    const updateData = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // Use Mongoose model
    const updatedTask = await Task.findOneAndUpdate(
      { _id: new ObjectId(id), userId: new ObjectId(user.id) },
      { $set: { ...updateData, updatedAt: new Date() } }, // Ensure updatedAt
      { new: true, runValidators: true }
    ).lean();

    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      task: updatedTask,
      message: 'Task updated successfully',
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

// Delete task
export async function DELETE(request, { params }) {
  try {
    await dbConnect();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // Use Mongoose model
    const deletedTask = await Task.findOneAndDelete({ 
      _id: new ObjectId(id), 
      userId: new ObjectId(user.id) 
    }).lean();

    if (!deletedTask) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}