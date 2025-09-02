import { useState, useEffect } from 'react';
import { User } from '../types';
import { AuthService } from '../services/AuthService';

export interface AuthContextType {
  user: User | null;
  session: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    AuthService.getCurrentSession().then((session) => {
      setSession(session);
      if (session?.user) {
        AuthService.getCurrentUser().then((user) => {
          setUser(user);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const unsubscribe = AuthService.onAuthStateChange((session) => {
      setSession(session);
      if (session?.user) {
        AuthService.getCurrentUser().then((user) => {
          setUser(user);
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await AuthService.signIn(email, password);
      setUser(result.user);
      setSession(result.session);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData: any) => {
    setLoading(true);
    try {
      const result = await AuthService.signUp(userData);
      setUser(result.user);
      setSession(result.session);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error('No user logged in');
    
    const updatedUser = await AuthService.updateUserProfile(user.id, updates);
    setUser(updatedUser);
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
}