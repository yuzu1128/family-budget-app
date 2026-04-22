import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, getErrorMessage } from '../lib/api-client';
import type { AppUser, AuthSession } from '../lib/api-types';

interface AuthContextType {
    session: AuthSession | null;
    user: AppUser | null;
    loading: boolean;
    error: string | null;
    signIn: (userId: string, password: string) => Promise<void>;
    register: (userId: string, password: string, fullName: string) => Promise<void>;
    refreshSession: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    error: null,
    signIn: async () => { },
    register: async () => { },
    refreshSession: async () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshSession = useCallback(async () => {
        try {
            const { user: sessionUser } = await apiClient.auth.getSession();
            setUser(sessionUser);
            setError(null);
        } catch (sessionError) {
            console.error('Session check failed:', sessionError);
            setUser(null);
            setError('Cloudflare Functions に接続できません。Pages Functions と D1/R2 bindings を確認してください。');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshSession();
    }, [refreshSession]);

    const signIn = useCallback(async (userId: string, password: string) => {
        const { user: authenticatedUser } = await apiClient.auth.login(userId, password);
        setUser(authenticatedUser);
        setError(null);
    }, []);

    const register = useCallback(async (userId: string, password: string, fullName: string) => {
        const { user: authenticatedUser } = await apiClient.auth.register(userId, password, fullName);
        setUser(authenticatedUser);
        setError(null);
    }, []);

    const signOut = useCallback(async () => {
        try {
            await apiClient.auth.logout();
            setUser(null);
            setError(null);
        } catch (signOutError) {
            console.error('Sign-out failed:', signOutError);
            setError(getErrorMessage(signOutError, 'ログアウトに失敗しました。'));
        }
    }, []);

    const value = useMemo<AuthContextType>(() => ({
        session: user ? { userId: user.id } : null,
        user,
        loading,
        error,
        signIn,
        register,
        refreshSession,
        signOut,
    }), [error, loading, refreshSession, signIn, signOut, user, register]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
