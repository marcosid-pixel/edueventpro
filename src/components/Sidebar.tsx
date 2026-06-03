import { LayoutDashboard, Calendar, GraduationCap, ShieldCheck, History, FileText, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { View, NavItem } from '../types';

export const Sidebar = ({ currentView, setView }: { currentView: View, setView: (v: View) => void }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'unified-calendar', label: 'Calendário Unificado', icon: Calendar },
    { id: 'courses', label: 'Gestão de Cursos', icon: GraduationCap },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ id: 'users-admin', label: 'Painel Admin', icon: ShieldCheck });
    navItems.push({ id: 'logs', label: 'Auditoria', icon: History });
    navItems.push({ id: 'reports', label: 'Relatórios', icon: FileText });
  }

  if (currentView === 'login' || currentView === 'signup') return null;

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-card-bg border-r border-outline-variant flex flex-col py-6 px-4 gap-2 z-50 transition-colors duration-300">
      <div className="mb-8 px-2">
        <h1 className="font-headline text-2xl font-bold text-text-primary">EduEvent Pro</h1>
        <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Gestão Acadêmica</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setView(item.id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
              currentView === item.id
                ? 'bg-secondary-container text-white shadow-sm'
                : 'text-text-secondary hover:bg-surface-container'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
        <div className="mt-4 pt-4 border-t border-outline-variant">
          <button onClick={() => setView('settings')}
            className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-all ${
              currentView === 'settings' ? 'bg-secondary-container text-white' : 'text-text-secondary hover:bg-surface-container'
            }`}
          >
            <Settings size={20} />
            <span className="font-medium">Configurações</span>
          </button>
          <button onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 w-full text-text-secondary hover:bg-surface-container rounded-lg transition-all mt-1"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span className="font-medium">{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
          </button>
        </div>
      </nav>
      <div className="mt-auto px-2">
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};
