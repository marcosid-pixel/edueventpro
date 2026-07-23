import { Clock, MapPin } from 'lucide-react';
import { getCourseStyle } from '../../utils';
import type { AcademicEvent } from '../../types';

interface NextEventCardProps {
  filteredEvents: AcademicEvent[];
}

const NextEventCard = ({ filteredEvents }: NextEventCardProps) => {
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
    <div className="bg-card-bg rounded-2xl border border-outline-variant/50 p-5 shadow-xs h-full">
      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">Próximos Eventos</h3>
      <div className="space-y-3">
        {futureEvents.length === 0 ? (
          <div className="py-6 text-center">
            <Clock size={24} className="mx-auto mb-2 text-text-secondary opacity-40" />
            <p className="text-xs text-text-secondary italic">Nenhum evento futuro</p>
          </div>
        ) : (
          futureEvents.map(event => {
            const cs = getCourseStyle(event.course);
            return (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-container/40 border border-outline-variant/40 hover:bg-surface-container/60 transition-colors">
                <div className={`w-10 h-10 rounded-xl ${cs.bg} ${cs.color} flex items-center justify-center shrink-0 border ${cs.border}`}>
                  <cs.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-primary line-clamp-1">{event.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-text-secondary">{event.timeStart || '--:--'} - {event.timeEnd || '--:--'}</span>
                    <span className="text-[10px] text-text-secondary opacity-50">|</span>
                    <span className="text-[10px] text-text-secondary">{formatDate(event.date)}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={10} className="text-text-secondary opacity-60" />
                      <span className="text-[10px] text-text-secondary line-clamp-1">{event.location}</span>
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
