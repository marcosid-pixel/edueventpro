import React from 'react';
import { ChevronRight, UserPlus, Users } from 'lucide-react';
import type { View, Speaker, AcademicEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';

const SpeakerView = () => {
  const { user } = useAuth();
  const { data: speakers } = useRealtimeCollection<Speaker>('speakers');
  const { data: events } = useRealtimeCollection<AcademicEvent>('events');

  const isAdmin = user?.role === 'ADMIN';

  const mySpeakers = isAdmin ? speakers : speakers.filter(s => s.createdBy === user?.id);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <nav className="flex items-center gap-2 text-text-secondary text-sm mb-2">
            <span>Gestão Acadêmica</span>
            <ChevronRight size={14} />
            <span className="text-secondary font-bold">{isAdmin ? 'Base Global de Convidados' : 'Meus Convidados'}</span>
          </nav>
          <h1 className="text-3xl font-bold font-headline text-text-primary mb-1">Gestão de Convidados</h1>
        </div>
        <button className="bg-text-primary text-card-bg h-[40px] px-6 rounded-lg flex items-center gap-2 hover:opacity-80 transition-all shadow-md active:scale-95 duration-150">
          <UserPlus size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Adicionar Convidado</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 bg-card-bg p-6 rounded-xl border border-outline-variant shadow-sm flex items-center justify-between transition-colors">
          <div className="flex gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Filtro por Titulação</label>
              <select className="border border-outline-variant rounded-lg bg-surface-container text-xs px-3 py-1.5 focus:ring-2 focus:ring-secondary-container outline-none text-text-primary">
                <option>Todos</option>
                <option>Doutorado (PhD)</option>
                <option>Mestrado (MSc)</option>
                <option>Especialização</option>
              </select>
            </div>
          </div>
        </div>

        <div className="col-span-4 bg-text-primary text-card-bg p-6 rounded-xl border border-white/5 flex items-center justify-between shadow-lg relative overflow-hidden group transition-colors duration-300">
          <div className="relative z-10">
            <p className="text-xs opacity-60 font-medium">{isAdmin ? 'Total Especialistas Cadastrados' : 'Meus Convidados'}</p>
            <p className="text-2xl font-bold font-headline mt-1">{mySpeakers.length} Especialistas</p>
          </div>
          <Users size={40} className="opacity-10 group-hover:scale-110 transition-transform duration-500" />
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-outline-variant shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-left">
          <thead className="bg-surface-container border-b border-outline-variant">
            <tr className="h-10">
              <th className="px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Nome do Convidado</th>
              <th className="px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Titulação</th>
              <th className="px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Contato</th>
              <th className="px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Eventos Vinculados</th>
              <th className="px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {mySpeakers.map(speaker => (
              <tr key={speaker.id} className="hover:bg-surface-container transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={speaker.avatar || `https://ui-avatars.com/api/?name=${speaker.name}`} className="w-10 h-10 rounded-full object-cover border border-outline-variant" alt={speaker.name} />
                    <div>
                      <p className="text-sm font-bold text-text-primary">{speaker.name}</p>
                      <p className="text-[10px] text-text-secondary font-medium">{speaker.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container/10 text-secondary border border-secondary/20 uppercase text-center block w-fit">
                    {speaker.title}
                  </span>
                </td>
                <td className="px-6 text-xs font-mono text-text-secondary">{speaker.phone}</td>
                <td className="px-6">
                  <div className="flex gap-1 flex-wrap">
                    {speaker.events.slice(0, 1).map(ev => (
                      <span key={ev} className="text-[9px] px-2 py-0.5 bg-surface-container rounded text-text-secondary border border-outline-variant font-medium">{ev}</span>
                    ))}
                    {speaker.events.length > 1 && <span className="text-[9px] font-bold text-secondary">+ {speaker.events.length - 1} mais</span>}
                    {speaker.events.length === 0 && <span className="text-[9px] text-text-secondary italic">Nenhum</span>}
                  </div>
                </td>
                <td className="px-6 text-right">
                   <button className="text-secondary hover:underline text-xs font-bold px-2 py-1">
                    {isAdmin ? 'Editar' : 'Detalhes'}
                  </button>
                </td>
              </tr>
            ))}
            {mySpeakers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-secondary italic text-sm">
                   {isAdmin ? 'Nenhum convidado no banco de dados.' : 'Você ainda não cadastrou nenhum convidado.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SpeakerView;
