import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface User {
  id: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role?: string;
}

type SimulatedRole = 'ADMIN' | 'PROFESSOR' | null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  simulatedRole: SimulatedRole;
  setSimulatedRole: (role: SimulatedRole) => void;
  effectiveRole: string | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readEffectiveRole(userRole: string | undefined): string | undefined {
  if (typeof window !== 'undefined') {
    const testMode = localStorage.getItem('testMode') === 'true';
    if (testMode) {
      const role = localStorage.getItem('testModeRole');
      if (role === 'ADMIN' || role === 'PROFESSOR') return role;
    }
  }
  return userRole;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRoleState] = useState<SimulatedRole>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('testMode');
      if (saved === 'true') {
        return (localStorage.getItem('testModeRole') as SimulatedRole) || null;
      }
    }
    return null;
  });

  const effectiveRole = useMemo(() => readEffectiveRole(user?.role), [user?.role, simulatedRole]);

  const setSimulatedRole = useCallback((role: SimulatedRole) => {
    setSimulatedRoleState(role);
    if (role) {
      localStorage.setItem('testMode', 'true');
      localStorage.setItem('testModeRole', role);
    } else {
      localStorage.removeItem('testMode');
      localStorage.removeItem('testModeRole');
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Error fetching user session:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (credentials: any) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha no login');
    setUser(data.user);
  };

  const signup = async (formData: any) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha no cadastro');
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const updateUser = (data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser, simulatedRole, setSimulatedRole, effectiveRole }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
