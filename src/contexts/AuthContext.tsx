'use client';

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserData {
  email: string;
  role?: string;
  isAdmin?: boolean;
  isPremium?: boolean;
  createdAt: any;
  [key: string]: any;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  isAdmin: boolean;
  loading: boolean;
  adminOnlyBlockedMessage: string | null;
  clearAdminOnlyBlockedMessage: () => void;
  signup: (email: string, password: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Kumami-dev lockdown: set NEXT_PUBLIC_ADMIN_ONLY_LOGIN="true" only on the
// kumami-dev App Hosting backend's env vars to restrict that deployment to
// admin accounts. Left unset everywhere else (local, production) by default.
const ADMIN_ONLY_LOGIN_ENABLED = process.env.NEXT_PUBLIC_ADMIN_ONLY_LOGIN === 'true';
export const ADMIN_ONLY_LOGIN_MESSAGE =
  'This environment is in admin-only testing mode. Please check back later.';

function hasAdminRole(data: Pick<UserData, 'role' | 'isAdmin'> | undefined): boolean {
  if (!data) return false;
  return data.role === 'superadmin' || data.role === 'admin' || data.isAdmin === true;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminOnlyBlockedMessage, setAdminOnlyBlockedMessage] = useState<string | null>(null);

  async function checkIsAdmin(uid: string): Promise<boolean> {
    const snap = await getDoc(doc(db, "users", uid));
    return hasAdminRole(snap.exists() ? (snap.data() as UserData) : undefined);
  }

  async function setupUser(user: User) {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        email: user.email,
        role: "user",
        isAdmin: false,
        isPremium: false,
        createdAt: serverTimestamp(),
      }, { merge: true });
    }

    const freshDoc = await getDoc(userDocRef);
    if (freshDoc.exists()) {
      const data = freshDoc.data() as UserData;
      setUserData(data);
      setIsAdmin(hasAdminRole(data));
    }
  }

  async function signup(email: string, password: string) {
    if (ADMIN_ONLY_LOGIN_ENABLED) {
      throw new Error(ADMIN_ONLY_LOGIN_MESSAGE);
    }
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(result.user);
    return result;
  }

  async function login(email: string, password: string) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (!result.user.emailVerified) {
      throw new Error("Please verify your email before logging in.");
    }
    if (ADMIN_ONLY_LOGIN_ENABLED && !(await checkIsAdmin(result.user.uid))) {
      await signOut(auth);
      throw new Error(ADMIN_ONLY_LOGIN_MESSAGE);
    }
    return result;
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    if (ADMIN_ONLY_LOGIN_ENABLED && !(await checkIsAdmin(result.user.uid))) {
      await signOut(auth);
      throw new Error(ADMIN_ONLY_LOGIN_MESSAGE);
    }
    return result;
  }

  function clearAdminOnlyBlockedMessage() {
    setAdminOnlyBlockedMessage(null);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          if (ADMIN_ONLY_LOGIN_ENABLED && !(await checkIsAdmin(user.uid))) {
            // Kumami-dev lockdown: boot any already-active non-admin session.
            await signOut(auth);
            setCurrentUser(null);
            setUserData(null);
            setIsAdmin(false);
            setAdminOnlyBlockedMessage(ADMIN_ONLY_LOGIN_MESSAGE);
          } else {
            setCurrentUser(user);
            await setupUser(user);
          }
        } else {
          // Keep user logged out until email is verified
          setCurrentUser(null);
          setUserData(null);
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    isAdmin,
    loading,
    adminOnlyBlockedMessage,
    clearAdminOnlyBlockedMessage,
    signup,
    login,
    logout,
    resetPassword,
    loginWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
