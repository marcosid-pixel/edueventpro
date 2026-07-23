import { useState } from 'react';
import { motion } from 'motion/react';
import { getCourseStyle } from '../../utils';
import type { AcademicEvent } from '../../types';

interface TodayTimelineProps {
  filteredEvents: AcademicEvent[];
}

const TodayTimeline = ({ filteredEvents }: TodayTimelineProps) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const getWeekDays = () => {
    const days = [];
    const start = new Date(now);
    start.setDate(start.getDate() - 3);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        dayName: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()],
        isToday: d.toISOString().split('T')[0] === todayStr,
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

  const dayEvents = filteredEvents
    .filter(e => e.date === selectedDate && e.status !== 'Cancelled')
    .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));

  const timeSlots = [];
  for (let h = 8; h <= 18; h++) {
    timeSlots.push(`${String(h).padStart(2, '0')}:00`);
  }

  const getEventPosition = (timeStart: string, timeEnd: string) => {
    const [hS, mS] = timeStart.split(':').map(Number);
    const [hE, mE] = (timeEnd || timeStart).split(':').map(Number);
    const startMinutes = hS * 60 + mS - 8 * 60;
    const endMinutes = hE * 60 + mE - 8 * 60;
    const totalMinutes = 10 * 60;
    const top = (startMinutes / totalMinutes) * 100;
    const height = Math.max(((endMinutes - startMinutes) / totalMinutes) * 100, 4);
    return { top: `${top}%`, height: `${height}%` };
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes() - 8 * 60;
  const showCurrentTime = selectedDate === todayStr && currentMinutes >= 0 && currentMinutes <= 10 * 60;
  const currentTimeTop = `${(currentMinutes / (10 * 60)) * 100}%`;

  return (
    <div className="bg-card-bg rounded-2xl border border-outline-variant/50 p-5 shadow-xs">
      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4">Agenda de Hoje</h3>

      {/* Day Picker Pills */}
      <div className="flex items-center justify-between mb-5 px-1">
        {weekDays.map(day => (
          <button
            key={day.date}
            onClick={() => setSelectedDate(day.date)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              selectedDate === day.date
                ? 'bg-secondary text-white shadow-md shadow-secondary/30 scale-105'
                : day.isToday
                  ? 'bg-secondary/10 text-secondary border border-secondary/20'
                  : 'hover:bg-surface-container/60 text-text-secondary'
            }`}
          >
            <span className={`text-[9px] font-bold uppercase tracking-wider ${
              selectedDate === day.date ? 'text-white/80' : ''
            }`}>{day.dayName}</span>
            <span className={`text-sm font-black ${
              selectedDate === day.date ? 'text-white' : day.isToday ? 'text-secondary' : 'text-text-primary'
            }`}>{day.dayNum}</span>
            {day.isToday && selectedDate !== day.date && (
              <span className="text-[8px] font-bold text-secondary">Sat</span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative" style={{ height: `${timeSlots.length * 52}px` }}>
        {/* Time labels */}
        {timeSlots.map((time, i) => (
          <div
            key={time}
            className="absolute left-0 w-12 flex items-start"
            style={{ top: `${i * 52}px` }}
          >
            <span className="text-[10px] font-mono text-text-secondary/60 -mt-1.5">{time}</span>
          </div>
        ))}

        {/* Grid lines */}
        {timeSlots.map((_, i) => (
          <div
            key={i}
            className="absolute left-14 right-0 border-t border-outline-variant/30"
            style={{ top: `${i * 52}px` }}
          />
        ))}

        {/* Current time indicator */}
        {showCurrentTime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute left-12 right-0 z-20 flex items-center"
            style={{ top: currentTimeTop }}
          >
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full -ml-1.5 shadow-md shadow-red-500/30" />
            <div className="flex-1 h-0.5 bg-red-500/80" />
          </motion.div>
        )}

        {/* Event Blocks */}
        {dayEvents.map(event => {
          if (!event.timeStart) return null;
          const pos = getEventPosition(event.timeStart, event.timeEnd || event.timeStart);
          const cs = getCourseStyle(event.course);
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute left-16 right-2 z-10"
              style={{ top: pos.top, height: pos.height }}
            >
              <div className={`h-full rounded-xl border ${cs.border} ${cs.bg} p-2.5 flex items-center gap-2.5 hover:shadow-md transition-shadow cursor-pointer overflow-hidden`}>
                <div className={`w-8 h-8 rounded-lg ${cs.bg} border ${cs.border} flex items-center justify-center shrink-0`}>
                  <cs.icon size={14} className={cs.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-bold ${cs.color} line-clamp-1`}>{event.title}</p>
                  <p className="text-[9px] text-text-secondary font-mono">
                    {event.timeStart} - {event.timeEnd || '--:--'}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}

        {dayEvents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center opacity-30">
              <p className="text-xs text-text-secondary italic">Nenhum evento neste dia</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayTimeline;
