import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Safety timeout: Never let the app hang on loading for more than 10 seconds
        const safetyTimeout = setTimeout(() => {
            setLoading(prevLoading => {
                if (prevLoading) {
                    console.warn('AuthContext: Loading safety timeout triggered.');
                    return false;
                }
                return prevLoading;
            });
        }, 10000);

        // Check if user is logged in on mount
        const token = localStorage.getItem('token');
        if (token) {
            loadUser().finally(() => clearTimeout(safetyTimeout));
        } else {
            setLoading(false);
            clearTimeout(safetyTimeout);
        }

        return () => clearTimeout(safetyTimeout);
    }, []);

    const loadUser = async () => {
        try {
            const response = await authAPI.getCurrentUser();
            setUser(response.data.user);
        } catch (error) {
            console.error('Failed to load user:', error);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setUser(user);
        return user;
    };

    const register = async (email, password, name, role = 'viewer') => {
        const response = await authAPI.register({ email, password, name, role });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setUser(user);
        return user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isAuctioneer: user?.role === 'auctioneer' || user?.role === 'admin',
        isTeamOwner: user?.role === 'team_owner',
        isParticipant: user?.role === 'participant'
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
