import { NextResponse } from 'next/server';
import User from '@/models/User';
import { createToken, setAuthToken } from '@/lib/auth-utils';
import dbConnect from '@/lib/mongodb';

export async function POST(request) {
  try {
    await dbConnect(); 

    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await User.findByEmail(email.toLowerCase());
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isPasswordValid = await User.comparePassword(email, password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    try {
      const token = createToken(user);
    
      const userData = {
        id: user._id.toString(),
        email: user.email,
        name: user.name || '',
        role: user.role || 'user'
      };
   
      const response = NextResponse.json(
        { 
          success: true,
          user: userData,
          message: 'Login successful' 
        },
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );

      setAuthToken(response, token);
      
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      
      console.log('Login successful for user:', user.email);
      return response;
    } catch (tokenError) {
      console.error('Token creation failed:', tokenError);
      return NextResponse.json(
        { error: 'Failed to create authentication token' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during login' },
      { status: error.status || 500 }
    );
  }
}