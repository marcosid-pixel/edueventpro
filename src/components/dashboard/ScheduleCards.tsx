import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { calculateTotalHours, getEventConfirmationState } from '../../utils';
import type { AcademicEvent } from '../../types';

interface ScheduleCardsProps {
  filteredEvents: AcademicEvent[];
}

const WaveSVG = () => (
  <svg width="40" height="10" viewBox="0 0 40 10" fill="none" className="opacity-40 mx-1.5 shrink-0">
    <path d="M0 5 Q5 0 10 5 Q15 10 20 5 Q25 0 30 5 Q35 10 40 5" stroke="white" strokeWidth="1.5" fill="none" />
  </svg>
);

const ProgressBar = ({ confirmed, pending, cancelled, total }: { confirmed: number; pending: number; cancelled: number; total: number }) => {
  if (total === 0) return <div className="h-1.5 rounded-full bg-white/10" />;
  const confPct = (confirmed / total) * 100;
  const pendPct = (pending / total) * 100;
  const cancPct = (cancelled / total) * 100;
  return (
    <div className="w-full flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-white/10">
      {confPct > 0 && <div className="bg-green-400 rounded-full transition-all duration-700" style={{ width: `${confPct}%` }} />}
      {pendPct > 0 && <div className="bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${pendPct}%` }} />}
      {cancPct > 0 && <div className="bg-red-400 rounded-full transition-all duration-700" style={{ width: `${cancPct}%` }} />}
    </div>
  );
};

const ArrowBadge = ({ label, value, gradient }: { label: string; value: number | string; gradient?: string }) => (
  <div
    className="flex flex-col items-center justify-center bg-white px-4 py-2 shadow-lg relative z-10"
    style={{ clipPath: 'polygon(0% 0%, 80% 0%, 100% 50%, 80% 100%, 0% 100%)', minWidth: '68px' }}
  >
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{label}</span>
    <span className="text-2xl font-black text-slate-800 leading-none mt-0.5">{value}</span>
  </div>
);

const ScheduleCards = ({ filteredEvents }: ScheduleCardsProps) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // ---- Today ----
  const todayEvents = filteredEvents.filter((e) => e.date === todayStr);
  const todayHours = calculateTotalHours(todayEvents);
  const confirmedToday = todayEvents.filter((e) => {
    const s = getEventConfirmationState(e);
    return s === 'CONFIRMED' || s === 'AUTO_CONFIRMED';
  }).length;
  const pendingToday = todayEvents.filter((e) => {
    const s = getEventConfirmationState(e);
    return s === 'PENDING_CONFIRMATION';
  }).length;
  const cancelledToday = todayEvents.filter((e) => e.status === 'Cancelled').length;
  const productivityToday = todayEvents.length > 0 ? Math.round((confirmedToday / todayEvents.length) * 100) : 0;

  const formatHours = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins === 0 ? `${hrs}h` : `${hrs}h${mins > 0 ? ` ${mins}m` : ''}`;
  };

  // ---- Yesterday ----
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayEvents = filteredEvents.filter((e) => e.date === yesterdayStr);
  const yesterdayHours = calculateTotalHours(yesterdayEvents);
  const confirmedYesterday = yesterdayEvents.filter((e) => {
    const s = getEventConfirmationState(e);
    return s === 'CONFIRMED' || s === 'AUTO_CONFIRMED';
  }).length;
  const pendingYesterday = yesterdayEvents.filter((e) => {
    const s = getEventConfirmationState(e);
    return s === 'PENDING_CONFIRMATION';
  }).length;
  const cancelledYesterday = yesterdayEvents.filter((e) => e.status === 'Cancelled').length;
  const productivityYesterday = yesterdayEvents.length > 0 ? Math.round((confirmedYesterday / yesterdayEvents.length) * 100) : 0;

  return (
    <div className="space-y-3 max-w-xl">
      {/* Today Card - Orange Gradient */}
      <div className="relative bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 rounded-2xl h-24 overflow-hidden shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white rounded-full blur-2xl" />
          <div className="absolute -left-3 -bottom-3 w-24 h-24 bg-white rounded-full blur-xl" />
        </div>

        <div className="relative z-10 h-full flex items-center">
          {/* Arrow Badge - Date */}
          <ArrowBadge label={dayNames[now.getDay()]} value={now.getDate()} />

          {/* Left Half - Produtivo */}
          <div className="flex-1 flex items-center justify-center gap-1 px-4 min-w-0">
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider shrink-0">Produtivo</span>
            <WaveSVG />
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5 border border-white/20 shrink-0">
              <span className="text-xs font-black text-white">{productivityToday}%</span>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-px h-12 bg-white/20 shrink-0" />

          {/* Right Half - Tempo Produtivo */}
          <div className="flex flex-col items-center justify-center gap-0.5 px-5 min-w-[90px]">
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider leading-none">Tempo</span>
            <span className="text-3xl font-black text-white leading-none">{formatHours(todayHours)}</span>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider leading-none">produtivo</span>
          </div>
        </div>
      </div>

      {/* Yesterday Card - Purple Gradient */}
      <div className="relative bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 rounded-2xl h-24 overflow-hidden shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white rounded-full blur-2xl" />
          <div className="absolute -left-3 -bottom-3 w-24 h-24 bg-white rounded-full blur-xl" />
        </div>

        <div className="relative z-10 h-full flex items-center">
          {/* Arrow Badge - Date */}
          <ArrowBadge label={dayNames[yesterday.getDay()]} value={yesterday.getDate()} />

          {/* Left Half - Produtivo */}
          <div className="flex-1 flex items-center justify-center gap-1 px-4 min-w-0">
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider shrink-0">Produtivo</span>
            <WaveSVG />
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5 border border-white/20 shrink-0">
              <span className="text-xs font-black text-white">{productivityYesterday}%</span>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-px h-12 bg-white/20 shrink-0" />

          {/* Right Half - Tempo Produtivo */}
          <div className="flex flex-col items-center justify-center gap-0.5 px-5 min-w-[90px]">
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider leading-none">Tempo</span>
            <span className="text-3xl font-black text-white leading-none">{formatHours(yesterdayHours)}</span>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider leading-none">produtivo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCards;
