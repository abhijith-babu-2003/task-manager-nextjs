'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('AuthContext: Checking authentication...');
        const res = await fetch('/api/auth/me', { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('AuthContext: Auth check response status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('AuthContext: Auth check response data:', data);
          
          if (data.user) {
            setUser(data.user);
            console.log('AuthContext: User authenticated:', data.user.email);
          } else {
            setUser(null);
            console.log('AuthContext: No user in response');
          }
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.log('AuthContext: Auth check failed:', res.status, errorData);
          setUser(null);
        }
      } catch (error) {
        console.error('AuthContext: Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('AuthContext: Attempting login for:', email);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await res.json();
      console.log('AuthContext: Login response:', { status: res.status, data });
      
      if (res.ok && data.success && data.user) {
        console.log('AuthContext: Login successful, setting user:', data.user);
        setUser(data.user);
        
        return { 
          success: true,
          user: data.user
        };
      }
      
      console.error('Login failed:', data.error || 'Unknown error');
      return { 
        success: false, 
        error: data.error || 'Login failed. Please try again.' 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state even if request fails
      setUser(null);
      router.push('/login');
    }
  };

  const register = async (name, email, password) => {
    try {
      console.log('AuthContext: Attempting registration for:', email);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include'
      });

      const data = await res.json();
      console.log('AuthContext: Registration response:', { status: res.status, data });
      
      if (res.ok && data.success && data.user) { // Fixed: Check data.success
        console.log('AuthContext: Registration successful, setting user:', data.user);
        setUser(data.user);
        
        return { 
          success: true,
          user: data.user,
          message: data.message || 'Registration successful'
        };
      }
      
      console.error('Registration failed:', data.error || 'Unknown error');
      return { 
        success: false, 
        error: data.error || 'Registration failed. Please try again.' 
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  };

  // Add debug logging for auth state changes
  console.log('AuthContext: Current user state:', { user, loading });
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      register,
      setUser
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);