# Plano: Gerenciar Aulas do Lote no EventForm

## Objetivo
Adicionar funcionalidade de adicionar/remover aulas de um lote existente diretamente na tela de edição do EventFuncionalidade para:
1. **Aulas em lote**: gerenciar aulas existentes (adicionar/remover)
2. **Aulas isoladas**: permitir criar um novo lote a partir dela (adicionar mais aulas)

## Arquivo a modificar
`src/views/EventForm.tsx`

---

## Alteração 1: Adicionar estado e lógica do lote (linha ~98)

Após `const [rescheduleReason, setRescheduleReason] = useState('');`, adicionar:

```typescript
// Gerenciamento de lote
const batchEvents = isEditing && initialData?.batchId
  ? allEventsData
      .filter(e => e.batchId === initialData.batchId)
      .sort((a, b) => a.date.localeCompare(b.date))
  : [];
const isBatch = batchEvents.length > 1;
const isIsolated = isEditing && !initialData?.batchId;
```

## Alteração 2: Adicionar função para adicionar aula ao lote

Adicionar após a função `handleSubmit` (linha ~426), antes do `return`:

```typescript
const handleAddBatchClass = async () => {
  if (!initialData) return;
  setLoading(true);
  try {
    // Determinar batchId: usar existente ou criar novo para aula isolada
    const currentBatchId = initialData.batchId || `LOTE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const baseTitle = formData.title.replace(/\s*\(Aula \d+\)$/, '');
    
    // Calcular próxima data
    let nextDate: Date;
    let nextAulaNum: number;
    
    if (isBatch && batchEvents.length > 0) {
      // Já é um lote: adicionar após a última aula
      const lastEvent = batchEvents[batchEvents.length - 1];
      nextDate = new Date(lastEvent.date + 'T12:00:00');
      nextDate.setDate(nextDate.getDate() + 7);
      nextAulaNum = batchEvents.length + 1;
    } else {
      // Aula isolada: adicionar 7 dias após a data atual
      nextDate = new Date(formData.date + 'T12:00:00');
      nextDate.setDate(nextDate.getDate() + 7);
      nextAulaNum = 2; // Esta será a segunda aula
    }
    
    const dateStr = toLocalDateStr(nextDate);

    const payload = {
      ...formData,
      title: `${baseTitle} (Aula ${nextAulaNum})`,
      date: dateStr,
      time: `${formData.timeStart} - ${formData.timeEnd}`,
      status: 'Scheduled',
      createdBy: initialData.createdBy,
      teacher: formData.teacher,
      notificar_admin: 0,
      updatedAt: new Date().toISOString(),
      plataforma_meet: formData.plataforma_meet ? 1 : 0,
      meetLink: formData.meetLink || null,
      plataforma_comapos: formData.plataforma_comapos ? 1 : 0,
      convidado_externo: formData.convidado_externo ? 1 : 0,
      precisa_cabine: formData.precisa_cabine ? 1 : 0,
      category: formData.category,
      batchId: currentBatchId
    };

    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Falha ao criar aula');

    // Se era aula isolada, atualizar a aula atual para ter o batchId
    if (!initialData.batchId) {
      await fetch(`/api/events_update/${initialData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: currentBatchId, updatedAt: new Date().toISOString() })
      });
      // Atualizar título da aula atual para "(Aula 1)"
      await fetch(`/api/events_update/${initialData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: `${baseTitle} (Aula 1)`,
          updatedAt: new Date().toISOString() 
        })
      });
    }

    toast('Nova aula adicionada ao lote!');
  } catch (err) {
    console.error(err);
    toast('Erro ao adicionar aula');
  } finally {
    setLoading(false);
  }
};
```

## Alteração 3: Adicionar função para remover aula do lote

Após `handleAddBatchClass`:

```typescript
const handleRemoveBatchClass = async (eventId: string) => {
  if (eventId === initialData?.id) {
    toast('Não é possível remover a aula que está sendo editada');
    return;
  }
  if (!confirm('Deseja remover esta aula do lote?')) return;

  setLoading(true);
  try {
    const response = await fetch(`/api/events_delete/${eventId}`, { method: 'POST' });
    if (!response.ok) throw new Error('Falha ao remover aula');
    toast('Aula removida do lote!');

    // Se removeu uma aula e voltou para menos de 2, não é mais lote
    if (batchEvents.length <= 2) {
      // Atualizar o evento atual para não ter batchId
      await fetch(`/api/events_update/${initialData!.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: null, updatedAt: new Date().toISOString() })
      });
    }
  } catch (err) {
    console.error(err);
    toast('Erro ao remover aula');
  } finally {
    setLoading(false);
  }
};
```

## Alteração 4: Adicionar seção visual "Gerenciar Lote" no form

Na coluna da direita (col-span-4), após a seção "Horário" (linha ~1212) e antes de "Logística" (linha ~1214), adicionar:

```tsx
{isEditing && isBatch && (
  <div className="bg-card-bg p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-secondary-container transition-colors">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xs font-bold text-secondary-container flex items-center gap-2 uppercase tracking-widest font-headline">
        <Package size={16} /> Gerenciar Lote
      </h3>
      <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[10px] font-bold rounded-full border border-secondary/20">
        {batchEvents.length} aulas
      </span>
    </div>

    <div className="space-y-3">
      {/* Resumo do lote */}
      <div className="bg-surface-container/40 rounded-xl p-3 border border-outline-variant/60">
        <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-2">
          {batchEvents.length} aulas agendadas
        </p>
        <p className="text-[10px] text-text-secondary">
          {batchEvents[0]?.date?.split('-').reverse().slice(0, 2).join('/')} → {batchEvents[batchEvents.length-1]?.date?.split('-').reverse().slice(0, 2).join('/')}
        </p>
      </div>

      {/* Lista de aulas do lote */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {batchEvents.map((event, idx) => {
          const isCurrent = event.id === initialData?.id;
          const confirmState = getEventConfirmationState(event);
          let statusColor = 'bg-secondary';
          if (confirmState === 'CONFIRMED' || confirmState === 'AUTO_CONFIRMED') statusColor = 'bg-green-500';
          else if (confirmState === 'CANCELLED') statusColor = 'bg-red-500';
          else if (confirmState === 'PENDING_CONFIRMATION') statusColor = 'bg-orange-500 animate-pulse';

          return (
            <div key={event.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${isCurrent ? 'border-secondary bg-secondary/5' : 'border-outline-variant/60 bg-surface-container/30 hover:border-secondary/30'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                <div>
                  <p className={`text-[11px] font-bold ${isCurrent ? 'text-secondary' : 'text-text-primary'}`}>
                    {event.title.includes('(') ? event.title.split('(')[1]?.replace(')', '') : `Aula ${idx + 1}`}
                    {isCurrent && <span className="text-[9px] ml-1.5 opacity-60">(atual)</span>}
                  </p>
                  <p className="text-[9px] text-text-secondary font-medium">
                    {event.date.split('-').reverse().slice(0, 2).join('/')} • {event.timeStart}-{event.timeEnd}
                  </p>
                </div>
              </div>
              {!isCurrent && isAdmin && (
                <button
                  onClick={() => handleRemoveBatchClass(event.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                  title="Remover aula do lote"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Botão adicionar */}
      {isAdmin && (
        <button
          onClick={handleAddBatchClass}
          disabled={loading}
          className="w-full h-10 rounded-xl border-2 border-dashed border-secondary/40 text-secondary text-[11px] font-bold hover:bg-secondary/5 hover:border-secondary transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Plus size={14} /> Adicionar Aula ao Lote
        </button>
      )}
    </div>
  </div>
)}
```

---

## Resumo das mudanças

| # | O que | Onde |
|---|-------|------|
| 0 | Adicionar `Plus` no import lucide-react | Linha 2 (imports) |
| 1 | Estado `batchEvents` e `isBatch` | Após linha 98 (estado do componente) |
| 2 | Função `handleAddBatchClass` | Após linha 426 (após handleSubmit) |
| 3 | Função `handleRemoveBatchClass` | Após handleAddBatchClass |
| 4 | Seção visual "Gerenciar Lote" | Coluna direita, entre Horário e Logística |

## Não altera
- API backend (usa rotas existentes)
- Criação de eventos novos
- Tela de Gestão de Cursos
