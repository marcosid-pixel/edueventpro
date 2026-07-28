import { Clock, MapPin } from 'lucide-react';
import { getCourseStyle } from '../../utils';
import type { AcademicEvent } from '../../types';

interface NextEventCardProps {
  filteredEvents: AcademicEvent[];
  className?: string;
}

const NextEventCard = ({ filteredEvents, className = '' }: NextEventCardProps) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const futureEvents = filteredEvents
    .filter(e => {
      if (e.status === 'Cancelled') return false;
      if (e.date > todayStr) return true;
      if (e.date === todayStr && e.timeStart && e.timeStart > currentTime) return true;
      return false;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.timeStart || '').localeCompare(b.timeStart || '');
    })
    .slice(0, 3);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDate();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${monthNames[d.getMonth()]} ${day}`;
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm h-[204px] flex flex-col ${className}`}>
      <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">Próximos Eventos</h3>
      <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
        {futureEvents.length === 0 ? (
          <div className="py-6 text-center">
            <Clock size={24} className="mx-auto mb-2 text-slate-400 dark:text-slate-500 opacity-40" />
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">Nenhum evento futuro</p>
          </div>
        ) : (
          futureEvents.map(event => {
            const cs = getCourseStyle(event.course);
            return (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className={`w-10 h-10 rounded-xl ${cs.bg} ${cs.color} flex items-center justify-center shrink-0 border ${cs.border}`}>
                  <cs.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{event.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{event.timeStart || '--:--'} - {event.timeEnd || '--:--'}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 opacity-50">|</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{formatDate(event.date)}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={10} className="text-slate-400 dark:text-slate-500 opacity-60" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NextEventCard;
