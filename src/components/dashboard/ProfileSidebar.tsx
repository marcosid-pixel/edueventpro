import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Edit2, FlaskConical, Clock, BookOpen, Briefcase, Award, Users, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { calculateTotalHours, getEventConfirmationState, parseJsonArray } from '../../utils';
import type { AcademicEvent, User, Course, View } from '../../types';

interface ProfileSidebarProps {
  user: User | null;
  effectiveRole: string;
  filteredEvents: AcademicEvent[];
  allEvents: AcademicEvent[];
  courses: Course[];
  setView: (v: View) => void;
}

const ProfileSidebar = ({ user, effectiveRole, filteredEvents, allEvents, courses, setView }: ProfileSidebarProps) => {
  const { simulatedRole, setSimulatedRole } = useAuth();
  const isAdmin = effectiveRole === 'ADMIN';
  const userIsAdmin = user?.role === 'ADMIN';
  const isSimulated = simulatedRole !== null;

  const teacherEvents = allEvents.filter(e => e.teacher === user?.displayName);
  const confirmedCount = teacherEvents.filter(e => e.status === 'Confirmed' || e.status === 'Scheduled').length;
  const autoConfirmedCount = teacherEvents.filter(e => getEventConfirmationState(e) === 'AUTO_CONFIRMED').length;
  const pendingCount = teacherEvents.filter(e => getEventConfirmationState(e) === 'PENDING_CONFIRMATION').length;
  const cancelledCount = teacherEvents.filter(e => e.status === 'Cancelled').length;

  const totalEvents = isAdmin ? allEvents.length : filteredEvents.length;
  const teachingHours = isAdmin ? calculateTotalHours(allEvents) : calculateTotalHours(filteredEvents);

  const userCourseIds = parseJsonArray(user?.courseId);
  const uniqueCourses = [...new Set(filteredEvents.map(e => e.course))].filter(Boolean);

  const now = new Date();
  const workStart = user?.workStart || '09:00';
  const workEnd = user?.workEnd || '18:00';

  // Métricas admin
  const totalProfessors = allEvents.length > 0
    ? [...new Set(allEvents.map(e => e.teacher).filter(Boolean))].length
    : 0;
  const today = now.toISOString().split('T')[0];
  const aulasHoje = allEvents.filter(e => e.date === today).length;
  const pendingEvents = allEvents.filter(e => getEventConfirmationState(e) === 'PENDING_CONFIRMATION').length;
  const cancelledEvents = allEvents.filter(e => e.status === 'Cancelled').length;

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const pieData = isAdmin
    ? [
        { name: 'Confirmados', value: allEvents.filter(e => e.status === 'Confirmed' || e.status === 'Scheduled').length || 1, color: '#22c55e' },
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
    ? Math.round(((allEvents.filter(e => e.status === 'Confirmed' || e.status === 'Scheduled').length) / (allEvents.length || 1)) * 100)
    : Math.round((confirmedCount / (teacherEvents.length || 1)) * 100);
  const hoursPct = isAdmin ? Math.round(Math.min((teachingHours / 500) * 100, 100)) : Math.round(Math.min((teachingHours / 16) * 100, 100));
  const completedPct = Math.round(Math.min((totalEvents / (isAdmin ? 50 : 20)) * 100, 100));

  const capitalizedName = user?.displayName
    ? user.displayName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : 'Usuário';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md ring-1 ring-slate-200/50 dark:ring-slate-700/50 overflow-hidden">
      {/* Top accent line */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

      {/* Profile Section */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Perfil</h3>
          <button
            onClick={() => setView('settings')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            Editar
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative mb-3">
            <div className="w-[88px] h-[88px] rounded-full p-[3px] bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30">
              <img
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'U')}&background=6366f1&color=fff&bold=true&size=96`}
                alt={user?.displayName}
                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-green-500 rounded-full border-[3px] border-white dark:border-slate-900 flex items-center justify-center shadow-sm">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-800 dark:text-white text-center">{capitalizedName}</h3>
          <span className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
            isAdmin
              ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
              : 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
          }`}>
            {isAdmin ? 'Administrador' : 'Professor(a)'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
          {isAdmin ? (
            <>
              <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Users size={14} className="mx-auto mb-1 text-indigo-500" />
                <p className="text-lg font-black text-slate-800 dark:text-white leading-none">{totalProfessors}</p>
                <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Professores</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Calendar size={14} className="mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-black text-slate-800 dark:text-white leading-none">{aulasHoje}</p>
                <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Hoje</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Award size={14} className="mx-auto mb-1 text-purple-500" />
                <p className="text-lg font-black text-slate-800 dark:text-white leading-none">{pendingEvents}</p>
                <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Pendentes</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <BookOpen size={14} className="mx-auto mb-1 text-indigo-500" />
                <p className="text-lg font-black text-slate-800 dark:text-white leading-none">{totalEvents}</p>
                <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Aulas</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Briefcase size={14} className="mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-black text-slate-800 dark:text-white leading-none">
                  {Number.isInteger(teachingHours) ? teachingHours : teachingHours.toFixed(1)}
                </p>
                <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Horas</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Award size={14} className="mx-auto mb-1 text-purple-500" />
                <p className="text-lg font-black text-slate-800 dark:text-white leading-none">{uniqueCourses.length || userCourseIds.length}</p>
                <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Cursos</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Test Mode Section - Admin Only */}
      {userIsAdmin && (
        <div className={`px-5 py-4 border-t border-slate-100 dark:border-slate-700/50 transition-colors ${isSimulated ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FlaskConical size={14} className={isSimulated ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'} />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Modo Teste</span>
              {isSimulated && (
                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black rounded-full border border-amber-500/20">
                  ATIVO
                </span>
              )}
            </div>
            <button
              onClick={() => {
                if (isSimulated) {
                  setSimulatedRole(null);
                } else {
                  setSimulatedRole('PROFESSOR');
                }
              }}
              className={`relative w-10 h-5 rounded-full transition-all duration-300 ${isSimulated ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${isSimulated ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
            {isSimulated
              ? 'Visualizando como professor. Permissões restritas.'
              : 'Simule a experiência de um professor.'}
          </p>

          {isSimulated && (
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => setSimulatedRole('PROFESSOR')}
                className={`flex-1 py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all border ${
                  simulatedRole === 'PROFESSOR'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-400'
                }`}
              >
                Professor
              </button>
              <button
                onClick={() => setSimulatedRole('ADMIN')}
                className={`flex-1 py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all border ${
                  simulatedRole === 'ADMIN'
                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-400'
                }`}
              >
                Admin
              </button>
            </div>
          )}
        </div>
      )}

      {/* Working Hours Section */}
      <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700/50">
        <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Clock size={12} className="text-indigo-500" />
          Horário de Trabalho
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock size={10} className="text-indigo-500" />
              <p className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Início</p>
            </div>
            <p className="text-sm font-black text-slate-800 dark:text-white">{workStart}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border-2 border-purple-300 dark:border-purple-700 shadow-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock size={10} className="text-purple-500" />
              <p className="text-[9px] font-bold text-purple-500 dark:text-purple-400 uppercase tracking-wider">Fim</p>
            </div>
            <p className="text-sm font-black text-slate-800 dark:text-white">{workEnd}</p>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700/50">
        <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Estatísticas — {monthNames[now.getMonth()]}
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-24 h-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={26}
                  outerRadius={40}
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
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Confirmados</span>
              </div>
              <span className="text-[9px] font-black text-slate-700 dark:text-slate-200">{confirmedPct}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1">
              <div className="bg-green-500 h-1 rounded-full" style={{ width: `${confirmedPct}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Horas</span>
              </div>
              <span className="text-[9px] font-black text-slate-700 dark:text-slate-200">{hoursPct}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1">
              <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${hoursPct}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Concluídos</span>
              </div>
              <span className="text-[9px] font-black text-slate-700 dark:text-slate-200">{completedPct}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1">
              <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${completedPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;
