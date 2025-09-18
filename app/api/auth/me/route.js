import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request) {
  try {
    
    try {
      await dbConnect();
    } catch (dbError) {
      console.error('Auth/me: Database initialization failed:', dbError.message);
      return NextResponse.json(
        { user: null, error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { user: null, error: 'No authentication token' },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { user: null, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return NextResponse.json(
        { user: null, error: 'Invalid token format' },
        { status: 401 }
      );
    }


    

    let user;
    try {
      user = await User.findById(userId).select('-password'); 
    } catch (userLookupError) {
      console.error('Auth/me: User lookup error:', userLookupError.message);
      return NextResponse.json(
        { user: null, error: 'User lookup failed' },
        { status: 500 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { user: null, error: 'User not found' },
        { status: 404 }
      );
    }

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