import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request) {
  try {
    // Initialize database connection with error handling
    try {
      await dbConnect();
      console.log('Auth/me: Database initialized successfully');
    } catch (dbError) {
      console.error('Auth/me: Database initialization failed:', dbError.message);
      return NextResponse.json(
        { user: null, error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      console.log('Auth/me: No auth token found in cookies');
      return NextResponse.json(
        { user: null, error: 'No authentication token' },
        { status: 401 }
      );
    }

    console.log('Auth/me: Verifying token...');
    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (tokenError) {
      console.error('Auth/me: Token verification error:', tokenError.message);
      return NextResponse.json(
        { user: null, error: 'Token verification failed' },
        { status: 401 }
      );
    }
    
    if (!decoded) {
      console.log('Auth/me: Token verification returned null');
      return NextResponse.json(
        { user: null, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      console.log('Auth/me: No user ID in token payload');
      return NextResponse.json(
        { user: null, error: 'Invalid token format' },
        { status: 401 }
      );
    }

    console.log('Auth/me: Looking up user by ID:', userId);
    
    // Find user in database with error handling
    let user;
    try {
      user = await User.findById(userId).select('-password'); // Exclude password
    } catch (userLookupError) {
      console.error('Auth/me: User lookup error:', userLookupError.message);
      return NextResponse.json(
        { user: null, error: 'User lookup failed' },
        { status: 500 }
      );
    }
    
    if (!user) {
      console.log('Auth/me: User not found for ID:', userId);
      return NextResponse.json(
        { user: null, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('Auth/me: User found:', user.email);

    // Return user data (without password)
    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({
      user: userData
    });

  } catch (error) {
    console.error('Auth/me: Unexpected error:', error);
    console.error('Auth/me: Error stack:', error.stack);
    
    return NextResponse.json(
      { user: null, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}