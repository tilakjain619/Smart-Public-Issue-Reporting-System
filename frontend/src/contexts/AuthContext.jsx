import React, { createContext, useContext, useEffect, useState } from 'react';
import { account } from '../lib/appwrite';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [officer, setOfficer] = useState(null);
    const [loading, setLoading] = useState(true);
    const BASE_API_URL = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const session = await account.get();
            setUser(session);
            
            // Get session ID for token
            let token = null;
            try {
                const currentSession = await account.getSession('current');
                token = currentSession.$id;
            } catch (e) {
                console.log('No session ID found');
            }

            // Check if this user is an officer
            try {
                const response = await fetch(`${BASE_API_URL}/api/officers?email=${session.email}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                const data = await response.json();
                if (data.officers && data.officers.length > 0) {
                    setOfficer(data.officers[0]);
                } else {
                    setOfficer(null);
                }
            } catch (err) {
                console.log('Error fetching officer profile');
            }
            
        } catch (error) {
            console.log('No active session');
            setUser(null);
            setOfficer(null);
        } finally {
            setLoading(false);
        }
    };


    const login = async (email, password) => {
        try {
            await account.createEmailPasswordSession(email, password);
            await checkUser();
            return { success: true };
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, error: error.message };
        }
    };

    const register = async (email, password, name) => {
        try {
            await account.create('unique()', email, password, name);
            await login(email, password);
            return { success: true };
        } catch (error) {
            console.error('Registration failed:', error);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
            setUser(null);
            setOfficer(null);
            return { success: true };
        } catch (error) {
            console.error('Logout failed:', error);
            return { success: false, error: error.message };
        }
    };

    const getToken = async () => {
        try {
            const session = await account.getSession('current');
            return session.$id; // Return session ID as token
        } catch (error) {
            console.error('Failed to get token:', error);
            return null;
        }
    };

    const isAdmin = () => {
        try {
            return user && user.labels && user.labels.includes('admin');
        } catch (error) {
            console.error('Failed to check admin status:', error);
            return false;
        }
    }

    const isOfficer = () => !!officer;

    const value = {
        user,
        officer,
        loading,
        login,
        register,
        logout,
        getToken,
        isSignedIn: !!user,
        checkUser,
        isAdmin,
        isOfficer
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};