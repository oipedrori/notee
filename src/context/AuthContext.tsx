"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut,
} from "firebase/auth";
import { getClientAuth, googleProvider } from "@/lib/firebase";
import { upsertUser } from "@/lib/firestore";

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    signInWithGoogle: async () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getClientAuth();
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
            if (firebaseUser) {
                await upsertUser(firebaseUser.uid, {
                    email: firebaseUser.email ?? "",
                    displayName: firebaseUser.displayName ?? "",
                });
            }
        });
        return unsubscribe;
    }, []);

    const signInWithGoogle = async () => {
        // Return the promise so the caller can handle errors (like unauthorized domain)
        await signInWithPopup(getClientAuth(), googleProvider);
    };

    const signOut = async () => {
        await firebaseSignOut(getClientAuth());
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

