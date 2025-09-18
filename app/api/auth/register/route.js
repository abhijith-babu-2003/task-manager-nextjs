import { NextResponse } from 'next/server';
import User from '@/models/User';
import { createToken, setAuthToken } from '@/lib/auth-utils';
import dbConnect from '@/lib/mongodb';

export async function POST(request) {
  try {
    await dbConnect(); 
    
    const { name, email, password } = await request.json();
    
    
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

   
    const existingUser = await User.findByEmail(email.toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    await newUser.save();
    
    
    const token = createToken(newUser);
    

    const userData = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role || 'user'
    };
    
    
    const response = NextResponse.json(
      { 
        success: true,
        user: userData,
        message: 'Registration successful' 
      },
      { status: 201 }
    );

  
    setAuthToken(response, token);
    
    
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    

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