// lib/auth-utils.js
import jwt from 'jsonwebtoken';
import User from '../models/User';
import dbConnect from '@/lib/mongodb'; // Fixed import

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const TOKEN_NAME = 'auth-token';

// Create JWT token
export function createToken(user) {
  if (!user || !user._id || !user.email) {
    throw new Error('Invalid user object for token creation');
  }

  return jwt.sign(
    { 
      id: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
export async function verifyToken(token) {
  try {
    if (!token) {
      console.error('verifyToken: No token provided');
      return null;
    }
    
    let tokenValue = token.trim();
    if (tokenValue.startsWith('Bearer ')) {
      tokenValue = tokenValue.split(' ')[1];
    }
    tokenValue = tokenValue.replace(/^"|"$/g, '');
    
    if (!tokenValue) {
      console.error('verifyToken: Invalid token format after cleanup');
      return null;
    }
    
    let decoded;
    try {
      decoded = jwt.verify(tokenValue, JWT_SECRET);
      console.log('verifyToken: Token decoded successfully for user:', decoded.email);
    } catch (jwtError) {
      console.error('verifyToken: JWT verification error:', jwtError.message);
      return null;
    }
    
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      console.error('verifyToken: Invalid token payload - missing user ID');
      return null;
    }
    
    if (typeof window !== 'undefined') {
      return {
        ...decoded,
        userId: userId,
        id: userId
      };
    }
    
    await dbConnect();
    
    try {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        console.error('verifyToken: User not found for ID:', userId);
        return null;
      }
      
      console.log('verifyToken: User verified in database:', user.email);
      
      return {
        userId: user._id.toString(),
        id: user._id.toString(),
        email: user.email,
        name: user.name || '',
        role: user.role || 'user'
      };
    } catch (userCheckError) {
      console.error('verifyToken: User lookup failed:', userCheckError);
      return {
        userId: userId,
        id: userId,
        email: decoded.email,
        name: decoded.name || '',
        role: decoded.role || 'user'
      };
    }
  } catch (error) {
    console.error('verifyToken: Unexpected error:', error.message);
    return null;
  }
}

// Get current user from token (Client-side only)
export async function getCurrentUserClient() {
  if (typeof window === 'undefined') return null;
  
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${TOKEN_NAME}=`))
    ?.split('=')[1];
    
  if (!token) return null;
  
  return verifyToken(token);
}

// Set auth token in cookies
export function setAuthToken(response, token) {
  if (!token) {
    console.error('setAuthToken: No token provided');
    return;
  }
  
  const cookieOptions = {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };
  
  try {
    if (response?.cookies?.set) {
      response.cookies.set({
        name: TOKEN_NAME,
        value: token,
        ...cookieOptions
      });
      console.log('setAuthToken: Cookie set via response.cookies.set');
    } else if (response?.headers?.set) {
      const expires = new Date(Date.now() + cookieOptions.maxAge * 1000).toUTCString();
      const cookieString = [
        `${TOKEN_NAME}=${token}`,
        `Path=${cookieOptions.path}`,
        `Max-Age=${cookieOptions.maxAge}`,
        `Expires=${expires}`,
        `SameSite=${cookieOptions.sameSite}`,
        cookieOptions.httpOnly ? 'HttpOnly' : '',
        cookieOptions.secure ? 'Secure' : ''
      ].filter(Boolean).join('; ');
      
      response.headers.set('Set-Cookie', cookieString);
      console.log('setAuthToken: Cookie set via Set-Cookie header');
    } else if (typeof document !== 'undefined') {
      const expires = new Date(Date.now() + cookieOptions.maxAge * 1000).toUTCString();
      document.cookie = `${TOKEN_NAME}=${token}; path=${cookieOptions.path}; expires=${expires}; SameSite=${cookieOptions.sameSite}`;
      console.log('setAuthToken: Cookie set via document.cookie');
    } else {
      console.error('setAuthToken: No valid method to set cookie');
    }
  } catch (error) {
    console.error('setAuthToken: Error setting cookie:', error);
  }
}

// Remove auth token (logout)
export function removeAuthToken(response) {
  const cookieOptions = {
    path: '/',
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  try {
    if (response?.cookies?.set) {
      response.cookies.set({
        name: TOKEN_NAME,
        value: '',
        ...cookieOptions
      });
    } else if (response?.headers?.set) {
      const cookieString = [
        `${TOKEN_NAME}=`,
        `Path=${cookieOptions.path}`,
        `Expires=${cookieOptions.expires.toUTCString()}`,
        `SameSite=${cookieOptions.sameSite}`,
        cookieOptions.httpOnly ? 'HttpOnly' : '',
        cookieOptions.secure ? 'Secure' : ''
      ].filter(Boolean).join('; ');
      
      response.headers.set('Set-Cookie', cookieString);
    } else if (typeof document !== 'undefined') {
      document.cookie = `${TOKEN_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  } catch (error) {
    console.error('removeAuthToken: Error removing cookie:', error);
  }
}

// Require authentication for protected routes
export async function requireAuth() {
  if (typeof window === 'undefined') return null;
  
  const user = await getCurrentUserClient();
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  return user;
}