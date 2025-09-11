import React, { createContext, useContext, useState, ReactNode } from 'react';

// Simple User type
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'homeowner' | 'contractor';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData: {
      firstName: string;
      lastName: string;
      role: 'homeowner' | 'contractor';
    }
  ) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithBiometrics: () => Promise<void>;
  isBiometricAvailable: () => Promise<boolean>;
  isBiometricEnabled: () => Promise<boolean>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return a default context instead of throwing
    return {
      user: null,
      loading: false,
      signIn: async () => {
        console.log('Auth not available - using fallback');
      },
      signUp: async () => {
        console.log('Auth not available - using fallback');
      },
      signOut: async () => {
        console.log('Auth not available - using fallback');
      },
      signInWithBiometrics: async () => {
        console.log('Biometric auth not available - using fallback');
      },
      isBiometricAvailable: async () => false,
      isBiometricEnabled: async () => false,
      enableBiometric: async () => {
        console.log('Biometric auth not available - using fallback');
      },
      disableBiometric: async () => {
        console.log('Biometric auth not available - using fallback');
      },
    };
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Simple demo user for development
  const demoUser: User = {
    id: 'demo-user-1',
    email: 'demo@mintenance.com',
    firstName: 'Demo',
    lastName: 'User',
    role: 'homeowner',
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Demo sign in for:', email);

      // Simulate a brief loading time
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Set demo user
      setUser(demoUser);
      console.log('Demo user signed in successfully');
    } catch (error) {
      console.error('Demo sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: {
      firstName: string;
      lastName: string;
      role: 'homeowner' | 'contractor';
    }
  ) => {
    try {
      setLoading(true);
      console.log('Demo sign up for:', email);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const newUser: User = {
        id: `demo-user-${Date.now()}`,
        email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
      };

      setUser(newUser);
      console.log('Demo user signed up successfully');
    } catch (error) {
      console.error('Demo sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('Demo sign out');
      setUser(null);
    } catch (error) {
      console.error('Demo sign out failed:', error);
    }
  };

  const signInWithBiometrics = async () => {
    console.log('Biometric sign in not available in demo mode');
    throw new Error('Biometric authentication not available');
  };

  const isBiometricAvailable = async () => false;
  const isBiometricEnabled = async () => false;
  const enableBiometric = async () => {
    throw new Error('Biometric authentication not available');
  };
  const disableBiometric = async () => {
    throw new Error('Biometric authentication not available');
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithBiometrics,
    isBiometricAvailable,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
