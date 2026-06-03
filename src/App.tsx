import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { Plus, Bell, GraduationCap, X } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { useRealtimeCollection } from './hooks/useRealtimeCollection';
import type { View, AcademicEvent, Notification } from './types';
import { isTestMode, apiPost } from './utils/index';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import Dashboard from './views/Dashboard';
import UnifiedCalendar from './views/UnifiedCalendar';
import EventList from './views/EventList';
import CourseManagementView from './views/CourseManagementView';
import UserManagementView from './views/UserManagementView';
import SpeakerView from './views/SpeakerView';
import ReportsView from './views/ReportsView';
import EventForm from './views/EventForm';
import SettingsView from './views/SettingsView';
import LoginView from './views/LoginView';
import SignupView from './views/SignupView';
import LogsView from './views/LogsView';

export default function App() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [currentView, setView] = useState<View>('login');
  const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const { data: globalNotifications } = useRealtimeCollection<Notification>('notifications');

  useEffect(() => {
    if (globalNotifications.length > 0) {
      const sorted = [...globalNotifications].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const latest = sorted[0];
      const isNew = latest && (Date.now() - new Date(latest.createdAt).getTime() < 10000);
      if (isNew) {
        setActiveToast(latest);
        const timer = setTimeout(() => setActiveToast(null), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [globalNotifications]);

  const handleNewEvent = () => {
    setEditingEvent(null);
    setView('new-event');
  };

  const handleSetView = (v: View) => {
    if (v !== 'new-event') {
      setEditingEvent(null);
    }
    setView(v);
  };

  const startEdit = (event: AcademicEvent) => {
    setEditingEvent(event);
    setView('new-event');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esse agendamento?')) return;
    try {
      const response = await fetch(`/api/events_delete/${id}`, { method: 'POST' });
      if (!response.ok) throw new Error('Erro ao excluir evento');
      if (!isTestMode()) await apiPost('/api/activity_logs', {
        title: 'Evento Excluído (via Lista)',
        message: `Evento ID ${id} excluído por ${user?.displayName}`,
        type: 'error',
        action: 'DELETE_EVENT',
        userId: user?.id,
        userName: user?.displayName,
        userRole: user?.role,
        userPhotoURL: user?.photoURL,
        eventId: id,
        createdAt: new Date().toISOString()
      });
      if (!isTestMode()) await apiPost('/api/notifications', {
        title: 'Evento Excluído',
        message: `${user?.displayName} excluiu um evento do calendário.`,
        type: 'warning',
        userId: user?.id,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
    } catch (err: any) {
      toast('Erro ao excluir: ' + (err.message || 'Erro desconhecido'));
    }
  };

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (currentView === 'login' || currentView === 'signup') {
          setView('dashboard');
        }
      } else {
        if (currentView !== 'signup') {
          setView('login');
        }
      }
    }
  }, [user, currentView, loading]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-surface dark:bg-[#030b1a] space-y-6 transition-colors duration-500">
        <div className="w-16 h-16 bg-secondary-container rounded-3xl flex items-center justify-center animate-pulse shadow-2xl shadow-blue-500/20">
          <GraduationCap className="text-white w-10 h-10" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-text-primary font-headline font-bold text-xl tracking-tight">EduEvent Pro</p>
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="w-full h-full bg-blue-500"
            />
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard setView={handleSetView} onEdit={startEdit} onDelete={handleDelete} />;
      case 'unified-calendar': return <UnifiedCalendar onEdit={startEdit} onDelete={handleDelete} />;
      case 'events': return <EventList onEdit={startEdit} onDelete={handleDelete} />;
      case 'courses': return <CourseManagementView onEditEvent={startEdit} setView={setView} />;
      case 'users-admin': return <UserManagementView />;
      case 'speakers': return <SpeakerView />;
      case 'reports': return <ReportsView />;
      case 'new-event': return <EventForm setView={handleSetView} initialData={editingEvent} />;
      case 'login': return <LoginView setView={handleSetView} />;
      case 'signup': return <SignupView setView={handleSetView} />;
      case 'logs': return <LogsView />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard setView={handleSetView} />;
    }
  };

  return (
    <div className={`min-h-screen bg-surface transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      <Sidebar currentView={currentView} setView={handleSetView} />
      <Header currentView={currentView} setView={handleSetView} onNewEvent={handleNewEvent} />
      <main className={`transition-all duration-300 ${currentView !== 'login' && currentView !== 'signup' ? 'ml-[260px] pt-24 px-8 pb-12' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      <AnimatePresence>
        {activeToast && currentView !== 'login' && currentView !== 'signup' && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="fixed top-20 right-8 z-[100] w-80 bg-card-bg border-2 border-secondary shadow-[0_20px_50px_rgba(var(--secondary),0.2)] rounded-2xl p-4 flex gap-4 items-start backdrop-blur-md"
          >
            <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary shadow-inner">
              <Bell size={20} className="animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-text-primary uppercase tracking-wider">{activeToast.title}</p>
              <p className="text-[10px] text-text-secondary mt-1 line-clamp-2 italic font-medium leading-relaxed">{activeToast.message}</p>
              <p className="text-[8px] font-black text-secondary mt-2 uppercase tracking-tighter">Agora mesmo • EduEvent Live</p>
            </div>
            <button onClick={() => setActiveToast(null)} className="text-text-secondary hover:text-red-500 transition-colors p-1">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {currentView !== 'login' && user?.role === 'ADMIN' && (
        <div className="fixed bottom-6 right-8 z-[60]">
          <button onClick={handleNewEvent}
            className="w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
          >
            <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
            <div className="absolute right-full mr-4 bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl uppercase tracking-widest pointer-events-none">
              Cadastro Rápido
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
