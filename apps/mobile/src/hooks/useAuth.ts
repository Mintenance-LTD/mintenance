import { useState, useEffect } from 'react';
import type { User } from '@mintenance/types';
import type { Session } from '@supabase/supabase-js';
import { AuthService, SignUpData } from '../services/AuthService';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

interface AuthResult {
  user: User | null;
  session: Session | null;
}

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    AuthService.getCurrentSession().then((currentSession) => {
      const sess = currentSession as Session | null;
      setSession(sess);
      if (sess?.user) {
        AuthService.getCurrentUser().then((currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange((_event: string, authSession: unknown) => {
      const sess = authSession as unknown as Session | null;
      setSession(sess);
      if (sess?.user) {
        AuthService.getCurrentUser().then((currentUser) => {
          setUser(currentUser);
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
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

  const signUp = async (userData: SignUpData) => {
    setLoading(true);
    try {
      const result = (await AuthService.signUp(userData)) as AuthResult;
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
