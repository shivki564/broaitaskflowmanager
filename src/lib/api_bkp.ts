// Authentication and API module
// Authenticates against the Server-Side SQLite users table

import { getAllFromCollection } from './database';

const DEFAULT_PASSWORDS: Record<string, string> = {
    'Admin': 'admin123',
    'Team Member': 'user123'
};

let authToken: string | null = null;

export const auth = {
    /**
     * Login with email and password via Server-Side SQLite backend
     */
    async login(email: string, password: string) {
        if (!email.trim() || !password) {
            throw new Error('Email and password are required.');
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password })
            });

            if (res.ok) {
                const data = await res.json();
                authToken = data.token;
                if (typeof window !== 'undefined') {
                    localStorage.setItem('btf_auth_token', data.token);
                    localStorage.setItem('btf_current_user', JSON.stringify(data.user));
                }
                return {
                    user: data.user,
                    token: data.token
                };
            }

            const errorData = await res.json().catch(() => ({}));
            if (errorData.error) {
                throw new Error(errorData.error);
            }
        } catch (err: any) {
            if (err.message && !err.message.includes('fetch')) {
                throw err;
            }
            // If server request failed due to network, attempt local verification fallback
            console.warn('Backend login network error, checking local cache:', err);
        }

        // Local fallback if offline or server unreachable
        const users = getAllFromCollection('users');
        const user = users.find((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());

        if (!user) {
            throw new Error('User not found. Please check your email.');
        }

        if (!user.is_active) {
            throw new Error('This account is deactivated. Please contact an administrator.');
        }

        const defaultPassword = DEFAULT_PASSWORDS[user.role] || 'user123';
        if (password !== defaultPassword) {
            throw new Error('Invalid password. Please try again.');
        }

        const token = btoa(`${user.id}:${Date.now()}:${Math.random()}`);
        authToken = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('btf_auth_token', token);
            localStorage.setItem('btf_current_user', JSON.stringify(user));
        }

        return {
            user,
            token
        };
    },

    /**
     * Set the auth token
     */
    setToken(token: string) {
        authToken = token;
        localStorage.setItem('btf_auth_token', token);
    },

    /**
     * Get the current auth token
     */
    getToken(): string | null {
        if (!authToken && typeof window !== 'undefined') {
            authToken = localStorage.getItem('btf_auth_token');
        }
        return authToken;
    },

    /**
     * Clear the auth token (logout)
     */
    logout() {
        authToken = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('btf_auth_token');
            localStorage.removeItem('btf_current_user');
        }
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.getToken();
    }
};
