'use client';

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Firebase imports are commented out to prevent any calls to the backend.
// import { auth } from '@/lib/firebase';
// import { onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
// import type { AuthCredential } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<User | null>;
  signInWithEmail: (email: string, pass: string) => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A mock user to use for development when Firebase is not configured.
// This object needs to satisfy the parts of the `User` type used in the app.
const mockUser: User = {
  uid: 'mock-user-id',
  email: 'dev.user@quanteasy.com',
  displayName: 'Dev User',
  photoURL: 'https://placehold.co/100x100.png',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  // Mock methods to satisfy the User type from 'firebase/auth'
  delete: async () => {},
  getIdToken: async () => 'mock-id-token',
  getIdTokenResult: async () => ({ token: 'mock-id-token' } as any),
  reload: async () => {},
  toJSON: () => ({}),
} as User;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is the bypass logic.
    // Instead of listening to Firebase auth state, we set a mock user.
    // This allows development without valid Firebase credentials.
    console.log("AuthContext: Using mock user for development. Firebase is disabled.");
    setUser(mockUser);
    setLoading(false);

    // Original Firebase logic is commented out below.
    // To re-enable Firebase, comment out the bypass logic above
    // and uncomment the logic below (and the imports at the top of the file).
    /*
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
    */
  }, []);

  // Mock functions to avoid making real Firebase calls
  const signInWithGoogle = async () => {
    console.log("Mock signInWithGoogle called");
    setUser(mockUser);
    setLoading(false);
  };

  const signUpWithEmail = async (email: string, pass: string): Promise<User | null> => {
    console.log("Mock signUpWithEmail called for:", email);
    setUser(mockUser);
    setLoading(false);
    return mockUser;
  };
  
  const signInWithEmail = async (email: string, pass: string): Promise<User | null> => {
    console.log("Mock signInWithEmail called for:", email);
    setUser(mockUser);
    setLoading(false);
    return mockUser;
  };

  const signOut = async () => {
    console.log("Mock signOut called");
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
