import { LayoutDashboard, Calendar, GraduationCap, ShieldCheck, History, FileText, Settings, LogOut, Moon, Sun, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { View, NavItem } from '../types';

export const Sidebar = ({ currentView, setView }: { currentView: View, setView: (v: View) => void }) => {
  const { user, logout, effectiveRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'courses', label: 'Gestão de Cursos', icon: GraduationCap },
    { id: 'controle-geral', label: 'Controle de Eventos', icon: Calendar },
  ];

  if (effectiveRole === 'ADMIN' || effectiveRole === 'COORDENADOR') {
    navItems.push({ id: 'users-admin', label: 'Painel Admin', icon: ShieldCheck });
    navItems.push({ id: 'logs', label: 'Auditoria', icon: History });
    navItems.push({ id: 'reports', label: 'Relatórios', icon: FileText });
  }

  if (effectiveRole === 'PROFESSOR') {
    navItems.push({ id: 'course-history', label: 'Histórico', icon: Clock });
  }

  if (currentView === 'login' || currentView === 'signup') return null;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col py-6 px-4 gap-2 z-50 transition-colors duration-300 overflow-y-auto">
      <div className="mb-8 px-3">
        <h1 className="font-headline text-2xl font-bold text-slate-800 dark:text-white">EduEvent Pro</h1>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Gestão Acadêmica</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setView(item.id)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
              currentView === item.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={() => setView('settings')}
            className={`flex items-center gap-3 px-4 py-2.5 w-full rounded-xl transition-all text-sm font-medium ${
              currentView === 'settings' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings size={20} />
            <span>Configurações</span>
          </button>
          <button onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-2.5 w-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all mt-1 text-sm font-medium"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
          </button>
        </div>
      </nav>
      <div className="mt-auto px-2">
        <button onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all text-sm font-medium"
        >
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};
