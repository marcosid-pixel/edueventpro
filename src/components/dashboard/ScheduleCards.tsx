import { motion } from 'motion/react';
import { Clock, Zap, BarChart2 } from 'lucide-react';
import { calculateTotalHours, getEventConfirmationState } from '../../utils';
import type { AcademicEvent } from '../../types';

interface ScheduleCardsProps {
  filteredEvents: AcademicEvent[];
}

const ScheduleCards = ({ filteredEvents }: ScheduleCardsProps) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayName = dayNames[now.getDay()];
  const dayNum = now.getDate();
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthName = monthNames[now.getMonth()];

  const todayEvents = filteredEvents.filter(e => e.date === todayStr);
  const todayHours = calculateTotalHours(todayEvents);
  const confirmedToday = todayEvents.filter(e => {
    const s = getEventConfirmationState(e);
    return s === 'CONFIRMED' || s === 'AUTO_CONFIRMED';
  }).length;
  const productivity = todayEvents.length > 0 ? Math.round((confirmedToday / todayEvents.length) * 100) : 0;

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
  const yesterdayEvents = filteredEvents.filter(e => e.date === yesterdayStr);
  const yesterdayHours = calculateTotalHours(yesterdayEvents);
  const confirmedYesterday = yesterdayEvents.filter(e => {
    const s = getEventConfirmationState(e);
    return s === 'CONFIRMED' || s === 'AUTO_CONFIRMED';
  }).length;
  const yesterdayProductivity = yesterdayEvents.length > 0 ? Math.round((confirmedYesterday / yesterdayEvents.length) * 100) : 0;

  const formatHours = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Today Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-secondary/90 to-rose-400 text-white p-5 shadow-lg group">
        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Zap size={100} />
        </div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border border-white/30 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{dayName}</span>
            <span className="text-2xl font-black leading-none">{dayNum}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Produtivo</span>
              <span className="text-xs font-bold opacity-80">Hoje</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${productivity}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{productivity}%</span>
              <span className="text-xs font-bold opacity-80">Tempo Produtivo</span>
              <span className="text-sm font-black">{formatHours(todayHours)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Yesterday Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-400 to-rose-400 text-white p-5 shadow-lg group">
        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <BarChart2 size={100} />
        </div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border border-white/30 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{dayNames[yesterdayDate.getDay()]}</span>
            <span className="text-2xl font-black leading-none">{yesterdayDate.getDate()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Produtivo</span>
              <span className="text-xs font-bold opacity-80">Ontem</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${yesterdayProductivity}%` }}
                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                className="h-full rounded-full bg-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{yesterdayProductivity}%</span>
              <span className="text-xs font-bold opacity-80">Tempo Produtivo</span>
              <span className="text-sm font-black">{formatHours(yesterdayHours)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCards;
