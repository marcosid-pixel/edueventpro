import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface User {
  id: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role?: string;
  workStart?: string;
  workEnd?: string;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRoleState] = useState<SimulatedRole>(null);

  const isAdmin = user?.role === 'ADMIN';

  const effectiveRole = useMemo(() => {
    if (isAdmin && simulatedRole) return simulatedRole;
    return user?.role;
  }, [user?.role, simulatedRole, isAdmin]);

  const setSimulatedRole = useCallback((role: SimulatedRole) => {
    localStorage.setItem('simulatedRole', role || '');
    setSimulatedRoleState(role);
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          setUser(data.user);
          const saved = localStorage.getItem('simulatedRole');
          if (saved && data.user?.role === 'ADMIN') {
            setSimulatedRoleState(saved as SimulatedRole);
          } else {
            localStorage.removeItem('simulatedRole');
            setSimulatedRoleState(null);
          }
        } catch {
          console.error("Resposta do servidor não é JSON:", text.slice(0, 200));
          setUser(null);
        }
      } else {
        setUser(null);
        setSimulatedRoleState(null);
        localStorage.removeItem('simulatedRole');
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
    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Servidor indisponível. Verifique a configuração do banco de dados.");
    }
    if (!response.ok) throw new Error(data.error || 'Falha no login');
    setUser(data.user);
  };

  const signup = async (formData: any) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Servidor indisponível. Verifique a configuração do banco de dados.");
    }
    if (!response.ok) throw new Error(data.error || 'Falha no cadastro');
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setSimulatedRoleState(null);
      localStorage.removeItem('simulatedRole');
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