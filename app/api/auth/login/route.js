import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByEmail, initDB } from '@/lib/db';
import { createToken, setAuthToken } from '@/lib/auth-utils';

export async function POST(request) {
  try {
    // Ensure database is initialized
    try {
      await initDB();
    } catch (error) {
      console.error('Database initialization failed in login route:', error);
      return NextResponse.json(
        { error: 'Database initialization failed' },
        { status: 500 }
      );
    }
    const { email, password } = await request.json();
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    console.log('Attempting login for email:', email.toLowerCase());
    const user = await findUserByEmail(email.toLowerCase());
    
    if (!user) {
      console.log('User not found for email:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('User found, comparing password...');
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Invalid password for user:', user.email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Create JWT token
    const token = createToken(user);
    console.log('Token created for user:', user.email);
    
    // Create response with user data (without password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email
    };
    
    const response = NextResponse.json(
      { 
        user: userData,
        message: 'Login successful' 
      },
      { status: 200 }
    );
    
    // Set auth cookie
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });
    
    // Set CORS headers
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    
    console.log('Login successful for user:', user.email);
    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}