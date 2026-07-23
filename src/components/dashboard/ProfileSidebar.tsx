import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Clock, Calendar, BookOpen, Edit2 } from 'lucide-react';
import { calculateTotalHours, getEventConfirmationState, parseJsonArray } from '../../utils';
import type { AcademicEvent, User, Course } from '../../types';

interface ProfileSidebarProps {
  user: User | null;
  effectiveRole: string;
  filteredEvents: AcademicEvent[];
  allEvents: AcademicEvent[];
  courses: Course[];
}

const ProfileSidebar = ({ user, effectiveRole, filteredEvents, allEvents, courses }: ProfileSidebarProps) => {
  const isAdmin = effectiveRole === 'ADMIN';

  const teacherEvents = allEvents.filter(e => e.teacher === user?.displayName);
  const confirmedCount = teacherEvents.filter(e => e.status === 'Confirmed' || e.status === 'Completed').length;
  const autoConfirmedCount = teacherEvents.filter(e => getEventConfirmationState(e) === 'AUTO_CONFIRMED').length;
  const pendingCount = teacherEvents.filter(e => getEventConfirmationState(e) === 'PENDING_CONFIRMATION').length;
  const cancelledCount = teacherEvents.filter(e => e.status === 'Cancelled').length;

  const totalEvents = isAdmin ? allEvents.length : filteredEvents.length;
  const teachingHours = isAdmin ? calculateTotalHours(allEvents) : calculateTotalHours(filteredEvents);

  const userCourseIds = parseJsonArray(user?.courseId);
  const uniqueCourses = [...new Set(filteredEvents.map(e => e.course))].filter(Boolean);

  const now = new Date();
  const workStart = '09:00';
  const workEnd = '18:00';

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const pieData = isAdmin
    ? [
        { name: 'Confirmados', value: allEvents.filter(e => e.status === 'Confirmed' || e.status === 'Completed').length || 1, color: '#22c55e' },
        { name: 'Pendentes', value: allEvents.filter(e => getEventConfirmationState(e) === 'PENDING_CONFIRMATION').length || 0, color: '#f59e0b' },
        { name: 'Auto-confirmados', value: allEvents.filter(e => getEventConfirmationState(e) === 'AUTO_CONFIRMED').length || 0, color: '#6366f1' },
        { name: 'Cancelados', value: cancelledCount || 0, color: '#ef4444' },
      ].filter(d => d.value > 0)
    : [
        { name: 'Confirmados', value: confirmedCount || 1, color: '#22c55e' },
        { name: 'Pendentes', value: pendingCount || 0, color: '#f59e0b' },
        { name: 'Auto-confirmados', value: autoConfirmedCount || 0, color: '#6366f1' },
        { name: 'Cancelados', value: cancelledCount || 0, color: '#ef4444' },
      ].filter(d => d.value > 0);

  const confirmedPct = isAdmin
    ? Math.round(((allEvents.filter(e => e.status === 'Confirmed' || e.status === 'Completed').length) / (allEvents.length || 1)) * 100)
    : Math.round((confirmedCount / (teacherEvents.length || 1)) * 100);
  const hoursPct = isAdmin ? Math.round(Math.min((teachingHours / 500) * 100, 100)) : Math.round(Math.min((teachingHours / 16) * 100, 100));
  const completedPct = Math.round(Math.min((totalEvents / (isAdmin ? 50 : 20)) * 100, 100));

  return (
    <div className="bg-card-bg rounded-2xl border border-outline-variant/50 p-5 shadow-xs space-y-5">
      {/* Profile Header */}
      <div className="text-center">
        <div className="relative inline-block mb-3">
          <img
            src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'U')}&background=6366f1&color=fff&bold=true&size=96`}
            alt={user?.displayName}
            className="w-16 h-16 rounded-full object-cover border-2 border-outline-variant shadow-md"
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-card-bg flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        </div>
        <h3 className="text-sm font-bold text-text-primary">{user?.displayName || 'Usuário'}</h3>
        <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">
          {isAdmin ? 'Administrador' : 'Professor(a)'}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-xl bg-surface-container/40">
          <p className="text-lg font-black text-text-primary leading-none">{totalEvents}</p>
          <p className="text-[8px] font-bold text-text-secondary uppercase tracking-wider mt-1">
            {isAdmin ? 'Total' : 'Aulas'}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-surface-container/40">
          <p className="text-lg font-black text-text-primary leading-none">
            {Number.isInteger(teachingHours) ? teachingHours : teachingHours.toFixed(1)}
          </p>
          <p className="text-[8px] font-bold text-text-secondary uppercase tracking-wider mt-1">Horas</p>
        </div>
        <div className="p-2 rounded-xl bg-surface-container/40">
          <p className="text-lg font-black text-text-primary leading-none">{uniqueCourses.length || userCourseIds.length}</p>
          <p className="text-[8px] font-bold text-text-secondary uppercase tracking-wider mt-1">Cursos</p>
        </div>
      </div>

      {/* Working Hours */}
      <div>
        <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-2">Horário de Trabalho</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2.5 rounded-xl bg-secondary/5 border border-secondary/10">
            <p className="text-[9px] font-bold text-text-secondary mb-0.5">Início</p>
            <p className="text-xs font-black text-secondary">{workStart}</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-secondary/5 border border-secondary/10">
            <p className="text-[9px] font-bold text-text-secondary mb-0.5">Fim</p>
            <p className="text-xs font-black text-secondary">{workEnd}</p>
          </div>
        </div>
      </div>

      {/* Donut Chart - Statistics */}
      <div>
        <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-3">
          Estatísticas · {monthNames[now.getMonth()]}
        </h4>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={42}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold text-text-secondary">Confirmados</span>
              </div>
              <span className="text-[10px] font-black text-text-primary">{confirmedPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] font-bold text-text-secondary">Horas</span>
              </div>
              <span className="text-[10px] font-black text-text-primary">{hoursPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                <span className="text-[10px] font-bold text-text-secondary">Concluídos</span>
              </div>
              <span className="text-[10px] font-black text-text-primary">{completedPct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;
