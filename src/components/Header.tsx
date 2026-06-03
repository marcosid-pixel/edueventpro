import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Bell, CheckCircle2, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import type { View, Notification } from '../types';

export const Header = ({ setView, currentView, onNewEvent }: { setView: (v: View) => void, currentView: View, onNewEvent: () => void }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: notifications } = useRealtimeCollection<Notification>('notifications');
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile, setProfile] = useState({
    displayName: user?.displayName || 'Usuário',
    photoURL: user?.photoURL || ""
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const res = await fetch(`/api/users/${user.id}`);
        const data = await res.json();
        if (data) {
          setProfile({
            displayName: data.displayName || user.displayName || 'Usuário',
            photoURL: data.photoURL || user.photoURL || ""
          });
        }
      } catch (err) {
        console.error("Header profile fetch error:", err);
      }
    };
    fetchProfile();
  }, [user]);

  if (currentView === 'login' || currentView === 'signup') return null;

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-260px)] h-16 bg-card-bg border-b border-outline-variant flex items-center justify-between px-8 z-40 transition-colors duration-300">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">
            <Search size={18} />
          </span>
          <input className="w-full pl-10 pr-4 py-2 bg-surface-container border-none rounded-lg text-sm focus:ring-2 focus:ring-secondary-container transition-all outline-none text-text-primary" placeholder="Buscar eventos, cursos, palestras..." type="text" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        {user?.role === 'ADMIN' && (
          <button onClick={onNewEvent}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all shadow-md active:scale-95"
          >
            <Plus size={16} />
            Novo Agendamento
          </button>
        )}
        <div className="flex items-center gap-2 relative">
          <button onClick={toggleTheme} className="text-text-secondary hover:bg-surface-container p-2 rounded-full transition-colors">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)}
              className="text-text-secondary hover:bg-surface-container p-2 rounded-full relative transition-colors"
            >
              <Bell size={20} />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 rounded-full border-2 border-card-bg text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                  {notifications.filter(n => !n.isRead).length > 99 ? '99+' : notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-96 bg-card-bg border border-outline-variant shadow-2xl rounded-xl p-4 z-[100]"
                >
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary">Atividade Recente</h4>
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500/10 text-red-600 text-[9px] font-black rounded-full border border-red-500/20">
                          {notifications.filter(n => !n.isRead).length} novas
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <button onClick={async () => { try { await fetch('/api/notifications_read_all', { method: 'POST' }); } catch (err) {} }}
                          className="text-[9px] font-bold text-secondary uppercase hover:underline"
                        >Marcar todas</button>
                      )}
                      <button onClick={() => setShowNotifications(false)} className="text-[10px] font-bold text-text-secondary uppercase hover:text-red-500 transition-colors">✕</button>
                    </div>
                  </div>
                   <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                    {notifications.slice(0, 20).map(n => (
                      <div key={n.id}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer hover:bg-surface-container relative ${
                          !n.isRead ? 'bg-secondary/5 border-secondary/20' : 'border-outline-variant'
                        }`}
                        onClick={async () => {
                          if (!n.isRead) { try { await fetch(`/api/notifications_read/${n.id}`, { method: 'POST' }); n.isRead = 1; } catch (err) {} }
                        }}
                      >
                        <div className="flex items-start gap-3 pr-8">
                          <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                            !n.isRead ? 'bg-secondary animate-pulse' :
                            n.type === 'warning' ? 'bg-orange-500' :
                            n.type === 'error' ? 'bg-red-500' :
                            n.type === 'success' ? 'bg-green-500' : 'bg-blue-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold group-hover:text-secondary transition-colors ${!n.isRead ? 'text-text-primary' : 'text-text-secondary'}`}>{n.title}</p>
                            <p className="text-[10px] text-text-secondary italic mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[9px] text-text-secondary opacity-40 mt-1 font-mono">{new Date(n.updatedAt || n.createdAt).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        {!n.isRead && (
                          <button onClick={async (e) => { e.stopPropagation(); try { await fetch(`/api/notifications_read/${n.id}`, { method: 'POST' }); n.isRead = 1; } catch (err) {} }}
                            className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 bg-secondary/10 text-secondary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary hover:text-white" title="Marcar como lida"
                          ><CheckCircle2 size={14} /></button>
                        )}
                      </div>
                    ))}
                    {notifications.length === 0 && (<p className="text-xs text-text-secondary italic text-center py-4">Sem notificações.</p>)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="h-8 w-[1px] bg-outline-variant"></div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-text-primary tracking-wide">
              Olá, <span className="font-medium">{profile.displayName}</span>
            </p>
            <p className="text-[10px] text-text-secondary font-medium tracking-wider">{user?.role === 'ADMIN' ? 'Administrador' : 'Professor(a)'}</p>
          </div>
          <img alt="Perfil" onClick={() => setView('settings')}
            className="w-9 h-9 rounded-full border border-outline-variant object-cover cursor-pointer hover:ring-2 hover:ring-secondary-container transition-all"
            src={profile.photoURL || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
          />
        </div>
      </div>
    </header>
  );
};
