import { NextResponse } from 'next/server';
import User from '@/models/User';
import { createToken, setAuthToken } from '@/lib/auth-utils';
import { initDB } from '@/lib/db';

export async function POST(request) {
  try {
    await initDB();
    
    const { name, email, password } = await request.json();
    
    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email.toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create user (password hashing is handled in the User model)
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    await newUser.save();
    
    // Create JWT token and log the user in automatically
    const token = createToken(newUser);
    
    // Prepare user data (without password)
    const userData = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role || 'user'
    };
    
    // Create response
    const response = NextResponse.json(
      { 
        success: true,
        user: userData,
        message: 'Registration successful' 
      },
      { status: 201 }
    );

    // Set auth cookie
    setAuthToken(response, token);
    
    console.log('Registration successful for user:', newUser.email);
    
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}