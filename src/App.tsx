import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { GraduationCap } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { useRealtimeCollection } from './hooks/useRealtimeCollection';
import type { View, AcademicEvent, Notification } from './types';
import { isTestMode, apiPost } from './utils/index';
import { Sidebar } from './components/Sidebar';
import Dashboard from './views/Dashboard';
import ScheduleHub from './views/ScheduleHub';
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
import CourseHistoryView from './views/CourseHistoryView';
import ResetPasswordView from './views/ResetPasswordView';
import ConfirmView from './views/ConfirmView';

export default function App() {
  const { user, loading, effectiveRole } = useAuth();
  const { theme } = useTheme();
  const [currentView, setView] = useState<View>('login');
  const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);
  const { data: globalNotifications } = useRealtimeCollection<Notification>('notifications');

  if (window.location.pathname === '/reset-password') {
    return <ResetPasswordView />;
  }

  if (window.location.pathname.startsWith('/confirm/')) {
    return <ConfirmView />;
  }

  useEffect(() => {
    if (globalNotifications.length > 0) {
      const sorted = [...globalNotifications].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const latest = sorted[0];
      const diff = Date.now() - new Date(latest.createdAt).getTime();
      const isNew = Math.abs(diff) < 15000;
      
      const shownIds = JSON.parse(localStorage.getItem('shownNotifs') || '[]');
      
      if (isNew && !shownIds.includes(latest.id)) {
        toast(latest.title + '\n' + latest.message, { icon: '🔔', duration: 8000 });
        shownIds.push(latest.id);
        localStorage.setItem('shownNotifs', JSON.stringify(shownIds.slice(-50)));
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
    const isAdminOrCoordinator = effectiveRole === 'ADMIN' || effectiveRole === 'COORDENADOR';
    switch (currentView) {
      case 'dashboard': return <Dashboard setView={handleSetView} onNewEvent={handleNewEvent} onEdit={startEdit} onDelete={isAdminOrCoordinator ? handleDelete : undefined} />;
      case 'controle-geral': return <ScheduleHub onEdit={startEdit} onNewEvent={handleNewEvent} onDelete={isAdminOrCoordinator ? handleDelete : undefined} />;
      case 'unified-calendar': return <UnifiedCalendar onEdit={startEdit} onDelete={isAdminOrCoordinator ? handleDelete : undefined} />;
      case 'events': return <EventList onEdit={startEdit} onDelete={isAdminOrCoordinator ? handleDelete : undefined} />;
      case 'courses': return <CourseManagementView onEditEvent={startEdit} setView={setView} />;
      case 'course-history': return <CourseHistoryView setView={handleSetView} onEdit={startEdit} />;
      case 'users-admin': return isAdminOrCoordinator ? <UserManagementView /> : <Dashboard setView={handleSetView} onNewEvent={handleNewEvent} />;
      case 'speakers': return <SpeakerView />;
      case 'reports': return isAdminOrCoordinator ? <ReportsView /> : <Dashboard setView={handleSetView} onNewEvent={handleNewEvent} />;
      case 'new-event': return <EventForm setView={handleSetView} initialData={editingEvent} />;
      case 'login': return <LoginView setView={handleSetView} />;
      case 'signup': return <SignupView setView={handleSetView} />;
      case 'logs': return isAdminOrCoordinator ? <LogsView /> : <Dashboard setView={handleSetView} onNewEvent={handleNewEvent} />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard setView={handleSetView} onNewEvent={handleNewEvent} />;
    }
  };

  const isAuth = currentView === 'login' || currentView === 'signup';

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-row font-sans transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      <Toaster position="top-center" />
      {!isAuth && <Sidebar currentView={currentView} setView={handleSetView} />}
      <main className={`flex-1 flex flex-col min-w-0 ${isAuth ? 'w-full' : 'pl-64'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col min-h-screen"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
