import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByEmail, createUser } from '@/lib/db';
import { createToken, setAuthToken } from '@/lib/auth-utils';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();
    
    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email.toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    // Create JWT token
    const token = createToken(user);
    
    // Create response
    const response = NextResponse.json(
      { 
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        message: 'Registration successful' 
      },
      { status: 201 }
    );

    // Set auth cookie
    setAuthToken(response, token);
    
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
