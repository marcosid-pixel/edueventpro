import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  Download,
  BarChart2,
  UserCheck,
  ScrollText,
  Activity,
  CalendarX,
  CalendarClock,
  UserCog,
  Filter,
  GraduationCap,
  PenLine,
  Plus,
  Clock
} from 'lucide-react';
import { User as UserIcon, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { getEventHours, calculateTotalHours, parseJsonArray, getCourseStyle } from '../utils/index';
import type { View, ActivityLog, User, Course, AcademicEvent } from '../types';

const ReportsView = () => {
  const { data: activityLogs } = useRealtimeCollection<ActivityLog>('activity_logs');
  const { data: users } = useRealtimeCollection<User>('users');
  const { data: courses } = useRealtimeCollection<Course>('courses');
  const { data: events } = useRealtimeCollection<AcademicEvent>('events');
  const { user } = useAuth();
  
  const [professorFilter, setProfessorFilter] = useState('Todos');
  const [courseFilter, setCourseFilter] = useState('Todos');
  const [actionFilter, setActionFilter] = useState('Todos');
  const [dateFilter, setDateFilter] = useState('Todos'); 
  const [activeTab, setActiveTab] = useState<'dashboard' | 'docentes' | 'historico'>('dashboard');

  const teachers = users.filter(u => u.role === 'PROFESSOR' || u.role === 'ADMIN');
  const logs = [...activityLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredLogs = logs.filter(log => {
    const matchesProfessor = professorFilter === 'Todos' || log.userId === professorFilter || log.userName === (users.find(u => u.id === professorFilter)?.displayName);
    const matchesCourse = courseFilter === 'Todos' || log.courseName === courseFilter;
    const matchesAction = actionFilter === 'Todos' || 
      (actionFilter === 'Mudanças Professores' && (log.action === 'EDIT_EVENT' || log.action === 'RESCHEDULE_EVENT') && users.find(u => u.displayName === log.userName)?.role === 'PROFESSOR') ||
      (actionFilter === 'Cancelamentos' && log.action === 'CANCEL_EVENT') ||
      (actionFilter === 'Reagendamentos' && log.action === 'RESCHEDULE_EVENT') ||
      (actionFilter === 'Edições' && log.action === 'EDIT_EVENT');
    const matchesDate = dateFilter === 'Todos' || log.createdAt.startsWith(dateFilter);
    
    return matchesProfessor && matchesCourse && matchesAction && matchesDate;
  });

  const getMonthlyStats = () => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().substring(0, 7); 
    }).reverse();
    
    return months.map(m => {
      const mLogs = logs.filter(l => l.createdAt.startsWith(m));
      const cancellations = mLogs.filter(l => l.action === 'CANCEL_EVENT').length;
      const reschedules = mLogs.filter(l => l.action === 'RESCHEDULE_EVENT' || l.action === 'EDIT_EVENT').length;
      const label = new Date(m + '-02').toLocaleDateString('pt-BR', { month: 'short' });
      return { month: m, label, cancellations, reschedules };
    });
  };

  const monthlyStats = getMonthlyStats();

  const exportToExcel = () => {
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR');
    const profFilterText = professorFilter === 'Todos' ? 'Todos' : (users.find(u => u.id === professorFilter)?.displayName || 'Todos');

    let totalTeachingHrs = 0;
    let activeClassesCount = 0;
    let totalAbsencesCount = 0;
    let totalChangesCount = 0;

    teachers.forEach(t => {
      const tEvents = events.filter(e => e.teacher === t.displayName || e.createdBy === t.id);
      totalTeachingHrs += tEvents.reduce((sum, ev) => sum + getEventHours(ev), 0);
      activeClassesCount += tEvents.filter(e => e.status !== 'Completed' && e.status !== 'Cancelled').length;
      
      const tLogs = logs.filter(log => {
        const ev = events.find(e => e.id === log.eventId);
        return (ev && ev.teacher === t.displayName) || log.userName === t.displayName;
      });
      totalAbsencesCount += tLogs.filter(l => l.action === 'CANCEL_EVENT').length;
      totalChangesCount += tLogs.filter(l => l.action === 'RESCHEDULE_EVENT' || l.action === 'EDIT_EVENT').length;
    });

    let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Painel de Auditoria</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background-color: #f8fafc; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
    .title-banner { background: #0f172a; color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .title-banner h1 { margin: 0; font-size: 20px; font-weight: 800; color: #3b82f6; }
    .title-banner p { margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; }
    .filter-table { width: 100%; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px; }
    .filter-table td { padding: 8px 12px; font-size: 11px; color: #475569; border-bottom: 1px solid #f1f5f9; }
    .filter-table .label { font-weight: 700; color: #64748b; text-transform: uppercase; width: 20%; background-color: #f8fafc; }
    .filter-table .value { font-weight: 600; color: #0f172a; }
    .cards-table { width: 100%; margin-bottom: 24px; }
    .card-cell { width: 25%; padding: 6px; }
    .card-content { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; border-top: 4px solid #3b82f6; }
    .card-content.green { border-top-color: #10b981; }
    .card-content.red { border-top-color: #ef4444; }
    .card-content.orange { border-top-color: #f59e0b; }
    .card-title { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
    .card-value { font-size: 20px; font-weight: 800; color: #0f172a; }
    .section-header { font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 24px 0 10px 0; border-left: 4px solid #3b82f6; padding-left: 8px; }
    .data-table { width: 100%; border: 1px solid #e2e8f0; background: #ffffff; }
    .data-table th { background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 10px 12px; text-align: left; }
    .data-table td { font-size: 11px; padding: 9px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
    .data-table tr.zebra td { background: #f8fafc; }
    .badge { padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; text-align: center; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>

  <table style="width: 100%">
    <tr>
      <td>
        <div class="title-banner">
          <h1>EDUEVENT PRO</h1>
          <p>Relatório de Auditoria e Inteligência Logística Educacional &bull; Emitido em ${dateStr} às ${timeStr}</p>
        </div>
      </td>
    </tr>
  </table>

  <div class="section-header">Filtros Ativos do Painel</div>
  <table class="filter-table">
    <tr>
      <td class="label">Docente Selecionado</td>
      <td class="value">${profFilterText}</td>
      <td class="label">Curso / Área</td>
      <td class="value">${courseFilter}</td>
    </tr>
    <tr>
      <td class="label">Ação Registrada</td>
      <td class="value">${actionFilter}</td>
      <td class="label">Período Selecionado</td>
      <td class="value">${dateFilter}</td>
    </tr>
  </table>

  <table class="cards-table">
    <tr>
      <td class="card-cell">
        <div class="card-content">
          <div class="card-title">Média Carga Horária</div>
          <div class="card-value">${totalTeachingHrs.toFixed(1)} Hrs</div>
        </div>
      </td>
      <td class="card-cell">
        <div class="card-content green">
          <div class="card-title">Aulas Ativas</div>
          <div class="card-value">${activeClassesCount}</div>
        </div>
      </td>
      <td class="card-cell">
        <div class="card-content red">
          <div class="card-title">Faltas Docentes</div>
          <div class="card-value">${totalAbsencesCount}</div>
        </div>
      </td>
      <td class="card-cell">
        <div class="card-content orange">
          <div class="card-title">Mudanças Registradas</div>
          <div class="card-value">${totalChangesCount}</div>
        </div>
      </td>
    </tr>
  </table>

  <div class="section-header">Resumo Geral de Desempenho Docente</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%">Docente</th>
        <th style="width: 25%">E-mail Institucional</th>
        <th style="width: 15%; text-align: center;">Carga Horária Real</th>
        <th style="width: 15%; text-align: center;">Aulas Ativas</th>
        <th style="width: 10%; text-align: center;">Faltas (Canceladas)</th>
        <th style="width: 10%; text-align: center;">Modificações</th>
      </tr>
    </thead>
    <tbody>
`;

    teachers.forEach((t, index) => {
      const tEvents = events.filter(e => e.teacher === t.displayName || e.createdBy === t.id);
      const hrs = tEvents.reduce((sum, ev) => sum + getEventHours(ev), 0);
      const active = tEvents.filter(e => e.status !== 'Completed' && e.status !== 'Cancelled').length;
      
      const tLogs = logs.filter(log => {
        const ev = events.find(e => e.id === log.eventId);
        return (ev && ev.teacher === t.displayName) || log.userName === t.displayName;
      });
      const absences = tLogs.filter(l => l.action === 'CANCEL_EVENT').length;
      const changes = tLogs.filter(l => l.action === 'RESCHEDULE_EVENT' || l.action === 'EDIT_EVENT').length;
      
      const zebraClass = index % 2 === 1 ? 'class="zebra"' : '';
      
      html += `
      <tr ${zebraClass}>
        <td style="font-weight: 700; color: #0f172a;">${t.displayName}</td>
        <td>${t.email}</td>
        <td style="text-align: center; font-weight: 700; color: #2563eb;">${hrs.toFixed(1)} Hrs</td>
        <td style="text-align: center;">${active} Aulas</td>
        <td style="text-align: center; font-weight: 700; color: #dc2626;">${absences} Faltas</td>
        <td style="text-align: center; font-weight: 700; color: #d97706;">${changes} Ações</td>
      </tr>
      `;
    });

    html += `
    </tbody>
  </table>

  <div class="section-header">Histórico e Logs Detalhados de Auditoria</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 10%">Data</th>
        <th style="width: 8%">Hora</th>
        <th style="width: 15%">Responsável</th>
        <th style="width: 15%">Tipo de Evento</th>
        <th style="width: 32%">Descrição do Log</th>
        <th style="width: 10%; text-align: center;">Ação</th>
        <th style="width: 10%; text-align: center;">Severidade</th>
      </tr>
    </thead>
    <tbody>
`;

    filteredLogs.forEach((log, index) => {
      const date = new Date(log.createdAt).toLocaleDateString('pt-BR');
      const time = new Date(log.createdAt).toLocaleTimeString('pt-BR');
      
      const zebraClass = index % 2 === 1 ? 'class="zebra"' : '';
      
      let actionBadge = `<span class="badge badge-info">${log.action}</span>`;
      if (log.action === 'CANCEL_EVENT') {
        actionBadge = `<span class="badge badge-danger">CANCELADA</span>`;
      } else if (log.action === 'RESCHEDULE_EVENT') {
        actionBadge = `<span class="badge badge-warning">REAGENDADA</span>`;
      } else if (log.action === 'EDIT_EVENT') {
        actionBadge = `<span class="badge badge-warning">EDIÇÃO</span>`;
      } else if (log.action === 'CREATE_EVENT') {
        actionBadge = `<span class="badge badge-success">CRIADA</span>`;
      }

      let typeBadge = `<span class="badge badge-info">${log.type}</span>`;
      if (log.type === 'error' || log.type === 'danger') {
        typeBadge = `<span class="badge badge-danger">CRÍTICO</span>`;
      } else if (log.type === 'warning') {
        typeBadge = `<span class="badge badge-warning">ALERTA</span>`;
      } else if (log.type === 'success') {
        typeBadge = `<span class="badge badge-success">SUCESSO</span>`;
      }

      html += `
      <tr ${zebraClass}>
        <td>${date}</td>
        <td>${time}</td>
        <td style="font-weight: 600;">${log.userName || 'Sistema'}</td>
        <td style="color: #475569;">${log.title || ''}</td>
        <td style="font-style: italic; color: #475569;">${log.message || ''}</td>
        <td style="text-align: center;">${actionBadge}</td>
        <td style="text-align: center;">${typeBadge}</td>
      </tr>
      `;
    });

    html += `
    </tbody>
  </table>

</body>
</html>
`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_academic_completo_${new Date().toISOString().substring(0,10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalLogs = logs.length;
  const totalCancellations = logs.filter(l => l.action === 'CANCEL_EVENT').length;
  const totalReschedules = logs.filter(l => l.action === 'RESCHEDULE_EVENT' || l.action === 'EDIT_EVENT').length;
  
  const teacherChangesLogs = logs.filter(l => 
    (l.action === 'EDIT_EVENT' || l.action === 'RESCHEDULE_EVENT') && 
    users.find(u => u.displayName === l.userName)?.role === 'PROFESSOR'
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-text-secondary text-sm mb-2">
            <span>EduEvent Pro</span>
            <ChevronRight size={14} />
            <span className="font-bold text-text-primary">Centro de Inteligência</span>
          </nav>
          <h1 className="text-3xl font-black font-headline text-text-primary">Relatórios & Auditoria</h1>
          <p className="text-sm text-text-secondary mt-1">Visão analítica de ausências, reagendamentos, alterações de carga horária e auditoria geral.</p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/25 transition-all uppercase tracking-wider shrink-0"
        >
          <Download size={15} />
          Exportar Excel
        </button>
      </div>

      <div className="bg-surface-container/80 p-1.5 rounded-2xl flex gap-1 w-fit border border-outline-variant/50">
        {([
          { id: 'dashboard' as const, label: 'Visão Geral', icon: BarChart2, count: null },
          { id: 'docentes' as const, label: 'Desempenho Docente', icon: UserCheck, count: teachers.length },
          { id: 'historico' as const, label: 'Histórico', icon: ScrollText, count: filteredLogs.length },
        ]).map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-card-bg text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <TabIcon size={15} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-secondary/10 text-secondary' : 'bg-outline-variant/80 text-text-secondary'
                }`}>{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-card-bg border border-outline-variant rounded-2xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-slate-400/40 transition-all duration-300">
                <div className="h-[3px] bg-gradient-to-r from-slate-500 via-slate-400 to-transparent" />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform duration-200">
                      <Activity size={20} />
                    </div>
                    <span className="text-[9px] font-bold text-text-secondary uppercase bg-surface-container px-2 py-1 rounded-lg border border-outline-variant/60">Semestre</span>
                  </div>
                  <p className="text-4xl font-black font-headline text-text-primary leading-none">{totalLogs}</p>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-wider mt-2">Total de Alterações</p>
                  <p className="text-xs text-text-secondary mt-3 opacity-70">Histórico acumulado do semestre</p>
                </div>
              </div>

              <div className="bg-card-bg border border-outline-variant rounded-2xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-red-500/30 transition-all duration-300">
                <div className="h-[3px] bg-gradient-to-r from-red-500 via-red-400 to-transparent" />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform duration-200">
                      <CalendarX size={20} />
                    </div>
                    <span className="text-[9px] font-bold text-red-500 uppercase bg-red-500/5 px-2 py-1 rounded-lg border border-red-500/20">Crítico</span>
                  </div>
                  <p className="text-4xl font-black font-headline text-red-500 leading-none">{totalCancellations}</p>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-wider mt-2">Faltas / Cancelamentos</p>
                  <p className="text-xs text-text-secondary mt-3 opacity-70">Docentes ausentes no período</p>
                </div>
              </div>

              <div className="bg-card-bg border border-outline-variant rounded-2xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-secondary/30 transition-all duration-300">
                <div className="h-[3px] bg-gradient-to-r from-secondary via-secondary/60 to-transparent" />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform duration-200">
                      <CalendarClock size={20} />
                    </div>
                    <span className="text-[9px] font-bold text-secondary uppercase bg-secondary/5 px-2 py-1 rounded-lg border border-secondary/20">Ajustes</span>
                  </div>
                  <p className="text-4xl font-black font-headline text-secondary leading-none">{totalReschedules}</p>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-wider mt-2">Total Reagendamentos</p>
                  <p className="text-xs text-text-secondary mt-3 opacity-70">Ajustes de data/hora confirmados</p>
                </div>
              </div>

              <div className="bg-card-bg border border-outline-variant rounded-2xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-500/30 transition-all duration-300">
                <div className="h-[3px] bg-gradient-to-r from-amber-500 via-amber-400 to-transparent" />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform duration-200">
                      <UserCog size={20} />
                    </div>
                    <span className="text-[9px] font-bold text-amber-600 uppercase bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/20">Docentes</span>
                  </div>
                  <p className="text-4xl font-black font-headline text-amber-500 leading-none">{teacherChangesLogs.length}</p>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-wider mt-2">Alterações por Professores</p>
                  <p className="text-xs text-text-secondary mt-3 opacity-70">Modificações solicitadas pelos docentes</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-card-bg border border-outline-variant p-6 rounded-3xl shadow-sm">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">Tendência Mensal de Ocorrências</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Comparativo de reagendamentos vs. cancelamentos.</p>
                  </div>
                  <div className="flex gap-3 items-center text-[10px] font-bold text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-secondary" />
                      Reagend.
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                      Cancelam.
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-x-0 top-0 flex flex-col justify-between pointer-events-none" style={{ height: '168px' }}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="w-full h-px bg-outline-variant/40" />
                    ))}
                  </div>
                  <div className="relative flex items-end justify-between gap-2" style={{ height: '200px', paddingBottom: '32px' }}>
                    {monthlyStats.map((item, idx) => {
                      const maxVal = Math.max(...monthlyStats.map(s => Math.max(s.cancellations, s.reschedules, 1)));
                      const resPercent = (item.reschedules / maxVal) * 100;
                      const cancPercent = (item.cancellations / maxVal) * 100;
                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 group/bar">
                          <div className="flex gap-1.5 items-end justify-center w-full" style={{ height: '168px' }}>
                            <div className="relative flex-1 flex flex-col justify-end h-full" style={{ maxWidth: '20px' }}>
                              <div
                                className="w-full rounded-t-md transition-all duration-700 cursor-default"
                                style={{
                                  height: `${Math.max(resPercent, 4)}%`,
                                  background: 'linear-gradient(to bottom, var(--color-secondary), color-mix(in srgb, var(--color-secondary) 60%, transparent))'
                                }}
                              >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-secondary text-white text-[9px] font-black px-2 py-0.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-md">
                                  {item.reschedules}
                                </div>
                              </div>
                            </div>
                            <div className="relative flex-1 flex flex-col justify-end h-full" style={{ maxWidth: '20px' }}>
                              <div
                                className="w-full rounded-t-md transition-all duration-700 cursor-default"
                                style={{
                                  height: `${Math.max(cancPercent, 4)}%`,
                                  background: 'linear-gradient(to bottom, #EF4444, color-mix(in srgb, #EF4444 60%, transparent))'
                                }}
                              >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-md">
                                  {item.cancellations}
                                </div>
                              </div>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mt-2">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-card-bg border border-outline-variant p-6 rounded-3xl shadow-sm flex flex-col">
                <div className="mb-5">
                  <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">Distribuição de Ações</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Proporção dos tipos de atividade.</p>
                </div>
                <div className="relative flex items-center justify-center flex-1 py-4">
                  {(() => {
                    const total = totalLogs || 1;
                    const r = 52;
                    const circ = 2 * Math.PI * r;
                    const p1 = (totalCancellations / total) * circ;
                    const p2 = (totalReschedules / total) * circ;
                    const p3 = Math.max(circ - p1 - p2, 0);
                    return (
                      <svg className="w-44 h-44 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r={r} fill="transparent" stroke="rgba(0,0,0,0.06)" strokeWidth="14" />
                        {totalCancellations > 0 && (
                          <circle cx="60" cy="60" r={r} fill="transparent" stroke="#EF4444" strokeWidth="14"
                            strokeDasharray={`${p1} ${circ}`} strokeDashoffset="0" strokeLinecap="round" className="transition-all duration-700" />
                        )}
                        {totalReschedules > 0 && (
                          <circle cx="60" cy="60" r={r} fill="transparent" stroke="var(--color-secondary)" strokeWidth="14"
                            strokeDasharray={`${p2} ${circ}`} strokeDashoffset={-p1} strokeLinecap="round" className="transition-all duration-700" />
                        )}
                        {total - totalCancellations - totalReschedules > 0 && (
                          <circle cx="60" cy="60" r={r} fill="transparent" stroke="rgba(100,116,139,0.45)" strokeWidth="14"
                            strokeDasharray={`${p3} ${circ}`} strokeDashoffset={-(p1 + p2)} strokeLinecap="round" className="transition-all duration-700" />
                        )}
                      </svg>
                    );
                  })()}
                  <div className="absolute flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase text-text-secondary tracking-widest">Total</span>
                    <span className="text-3xl font-black font-headline text-text-primary">{totalLogs}</span>
                    <span className="text-[9px] text-text-secondary font-bold">ocorrências</span>
                  </div>
                </div>
                <div className="space-y-3 mt-2">
                  {[
                    { label: 'Cancelamentos', value: totalCancellations, colorDot: 'bg-red-500', colorText: 'text-red-500' },
                    { label: 'Reagendamentos', value: totalReschedules, colorDot: 'bg-secondary', colorText: 'text-secondary' },
                    { label: 'Outros', value: totalLogs - totalCancellations - totalReschedules, colorDot: 'bg-slate-400', colorText: 'text-text-secondary' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${item.colorDot}`} />
                      <span className="text-xs font-bold text-text-secondary flex-1">{item.label}</span>
                      <span className={`text-xs font-black ${item.colorText}`}>{Math.round((item.value / (totalLogs || 1)) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'docentes' && (
          <motion.div
            key="docentes-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="bg-card-bg border border-outline-variant rounded-3xl shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="text-base font-black uppercase text-text-primary tracking-wider">Acompanhamento Docente</h3>
                <p className="text-xs text-text-secondary mt-0.5">Carga horária, faltas e histórico de mudanças por profissional.</p>
              </div>
              <span className="text-[10px] font-black text-secondary bg-secondary/5 px-3 py-1.5 rounded-xl border border-secondary/20">
                {teachers.length} docentes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container/40">
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Docente</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Áreas / Modalidades</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-text-secondary tracking-widest text-center">Carga Horária</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-text-secondary tracking-widest text-center">Confirmadas</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-text-secondary tracking-widest text-center">Faltas</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-text-secondary tracking-widest text-center">Mudanças</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {teachers.map(t => {
                    const tEvents = events.filter(e => e.teacher === t.displayName || e.createdBy === t.id);
                    const hrs = tEvents.reduce((sum, ev) => sum + getEventHours(ev), 0);
                    const activeEvents = tEvents.filter(e => e.status === 'Confirmed').length;
                    const tLogs = logs.filter(log => {
                      const ev = events.find(e => e.id === log.eventId);
                      return (ev && ev.teacher === t.displayName) || log.userName === t.displayName;
                    });
                    const absences = tLogs.filter(l => l.action === 'CANCEL_EVENT').length;
                    const changes = tLogs.filter(l => l.action === 'RESCHEDULE_EVENT' || l.action === 'EDIT_EVENT').length;
                    const teacherCats = parseJsonArray(t.category);
                    const maxHrs = Math.max(...teachers.map(tt => {
                      const es = events.filter(e => e.teacher === tt.displayName || e.createdBy === tt.id);
                      return es.reduce((s, ev) => s + getEventHours(ev), 0);
                    }), 1);

                    return (
                      <tr key={t.id} className="hover:bg-surface-container/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <img
                                src={t.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.displayName || t.email)}&background=random&color=fff&bold=true`}
                                className="w-10 h-10 rounded-xl object-cover border border-outline-variant group-hover:border-secondary/40 transition-colors"
                                alt={t.displayName}
                              />
                              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card-bg flex items-center justify-center ${t.role === 'ADMIN' ? 'bg-orange-500' : 'bg-secondary'}`}>
                                {t.role === 'ADMIN' ? <Settings size={8} className="text-white" /> : <UserIcon size={8} className="text-white" />}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-text-primary group-hover:text-secondary transition-colors">{t.displayName}</p>
                              <p className="text-[10px] text-text-secondary font-mono">{t.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {teacherCats.slice(0, 2).map(cat => (
                              <span key={cat} className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-bold rounded-lg">
                                {cat}
                              </span>
                            ))}
                            {teacherCats.length > 2 && (
                              <span className="px-2 py-0.5 bg-surface-container text-text-secondary text-[10px] font-bold rounded-lg border border-outline-variant">
                                +{teacherCats.length - 2}
                              </span>
                            )}
                            {teacherCats.length === 0 && <span className="text-[10px] text-text-secondary italic">–</span>}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-sm font-black font-mono text-text-primary">{hrs.toFixed(1)}h</span>
                            <div className="w-20 h-1 bg-surface-container rounded-full overflow-hidden">
                              <div
                                className="h-full bg-secondary rounded-full transition-all duration-700"
                                style={{ width: `${(hrs / maxHrs) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                            {activeEvents}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                            absences > 0 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-surface-container text-text-secondary border border-outline-variant'
                          }`}>
                            {absences}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            {changes}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {teachers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-text-secondary italic">
                        Nenhum docente cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'historico' && (
          <motion.div
            key="historico-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-card-bg border border-outline-variant p-5 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                  <Filter size={13} />
                </div>
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Filtros Ativos</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-text-secondary tracking-wider block mb-1.5">Professor Responsável</label>
                  <select
                    value={professorFilter}
                    onChange={(e) => setProfessorFilter(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all"
                  >
                    <option value="Todos">Todos os Professores</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.displayName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-secondary tracking-wider block mb-1.5">Modalidade / Curso</label>
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all"
                  >
                    <option value="Todos">Todos os Cursos</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-secondary tracking-wider block mb-1.5">Tipo de Ocorrência</label>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all"
                  >
                    <option value="Todos">Todas as Ocorrências</option>
                    <option value="Mudanças Professores">Mudanças dos Professores</option>
                    <option value="Cancelamentos">Cancelamentos / Faltas</option>
                    <option value="Reagendamentos">Reagendamentos / Ajustes</option>
                    <option value="Edições">Outras Edições</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-secondary tracking-wider block mb-1.5">Período Mensal</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all"
                  >
                    <option value="Todos">Qualquer Período</option>
                    {Array.from({ length: 6 }, (_, i) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - i);
                      const val = d.toISOString().substring(0, 7);
                      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                      return <option key={val} value={val}>{label}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-card-bg border border-outline-variant rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-outline-variant flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black uppercase text-text-primary tracking-wider">Histórico Detalhado de Alterações</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Timeline completa de logs de auditoria.</p>
                </div>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container text-text-primary text-[11px] font-black rounded-xl border border-outline-variant">
                  <Activity size={12} className="text-secondary" />
                  {filteredLogs.length} ocorrências
                </span>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-4 text-text-secondary">
                      <ScrollText size={22} />
                    </div>
                    <p className="text-sm font-bold text-text-secondary">Nenhuma ocorrência encontrada</p>
                    <p className="text-xs text-text-secondary opacity-60 mt-1">Ajuste os filtros para ver mais resultados.</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[52px] top-0 bottom-0 w-px bg-gradient-to-b from-outline-variant via-outline-variant to-transparent pointer-events-none" />

                    {filteredLogs.map(log => {
                      const dateObj = new Date(log.createdAt);
                      const displayDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                      const displayTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                      const isCancel = log.action === 'CANCEL_EVENT';
                      const isReschedule = log.action === 'RESCHEDULE_EVENT';
                      const isCreate = log.action === 'CREATE_EVENT' || log.action === 'CREATE_BATCH';
                      const isEdit = log.action === 'EDIT_EVENT';

                      type BadgeConfig = { bg: string; text: string; border: string; icon: typeof CalendarX };
                      const badge: BadgeConfig = isCancel
                        ? { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/25', icon: CalendarX }
                        : isReschedule
                        ? { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/25', icon: CalendarClock }
                        : isEdit
                        ? { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/25', icon: PenLine }
                        : isCreate
                        ? { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/25', icon: Plus }
                        : { bg: 'bg-surface-container', text: 'text-text-secondary', border: 'border-outline-variant', icon: Activity };

                      const BadgeIcon = badge.icon;
                      const actionLabel = isCancel ? 'Cancelada' : isReschedule ? 'Reagendada' : isEdit ? 'Editada' : isCreate ? 'Criada' : log.action?.replace(/_/g, ' ') || '–';

                      return (
                        <div key={log.id} className="relative flex items-start gap-4 px-6 py-5 hover:bg-surface-container/20 transition-all">
                          <div className={`relative z-10 w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${badge.bg} ${badge.text} ${badge.border}`}>
                            <BadgeIcon size={13} />
                          </div>

                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-text-primary">{log.title}</p>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}>
                                  {actionLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary bg-surface-container px-2 py-0.5 rounded-lg font-mono border border-outline-variant/60 shrink-0">
                                <Clock size={10} />
                                {displayDate} · {displayTime}
                              </div>
                            </div>
                            <p className="text-xs text-text-secondary leading-relaxed">{log.message}</p>
                            <div className="flex items-center gap-3 mt-2.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
                                <UserIcon size={11} />
                                <span className="text-text-primary">{log.userName || 'Sistema'}</span>
                              </div>
                              {log.courseName && (
                                <>
                                  <div className="w-0.5 h-3 bg-outline-variant rounded-full" />
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
                                    <GraduationCap size={11} />
                                    <span className="text-text-primary">{log.courseName}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportsView;
