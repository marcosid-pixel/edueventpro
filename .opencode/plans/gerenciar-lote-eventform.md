# Plano: Aulas isoladas também podem virar lote

## Problema
Aulas isoladas (sem batchId) não mostram o botão "Adicionar Aula" na edição.

## Solução
2 alterações no `EventForm.tsx`:

### 1. Modificar `handleAddBatchClass` (linha ~437)

Trocar a função atual para aceitar aulas isoladas:

```typescript
const handleAddBatchClass = async () => {
  if (!initialData) return;
  setLoading(true);
  try {
    const baseTitle = formData.title.replace(/\s*\(Aula \d+\)$/, '');
    let batchId = initialData.batchId;
    let nextAulaNum: number;
    let nextDate: Date;

    if (batchId && batchEvents.length > 0) {
      const lastEvent = batchEvents[batchEvents.length - 1];
      nextDate = new Date(lastEvent.date + 'T12:00:00');
      nextDate.setDate(nextDate.getDate() + 7);
      nextAulaNum = batchEvents.length + 1;
    } else {
      batchId = `LOTE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      nextDate = new Date(formData.date + 'T12:00:00');
      nextDate.setDate(nextDate.getDate() + 7);
      nextAulaNum = 2;

      await fetch(`/api/events_update/${initialData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${baseTitle} (Aula 1)`, batchId, updatedAt: new Date().toISOString() })
      });
    }

    const dateStr = toLocalDateStr(nextDate);
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData, title: `${baseTitle} (Aula ${nextAulaNum})`, date: dateStr,
        time: `${formData.timeStart} - ${formData.timeEnd}`, status: 'Scheduled',
        createdBy: initialData.createdBy, teacher: formData.teacher, notificar_admin: 0,
        updatedAt: new Date().toISOString(), plataforma_meet: formData.plataforma_meet ? 1 : 0,
        meetLink: formData.meetLink || null, plataforma_comapos: formData.plataforma_comapos ? 1 : 0,
        convidado_externo: formData.convidado_externo ? 1 : 0, precisa_cabine: formData.precisa_cabine ? 1 : 0,
        category: formData.category, batchId
      })
    });
    if (!response.ok) throw new Error('Falha');
    toast(!initialData.batchId ? 'Lote criado! Aula adicionada.' : 'Aula adicionada ao lote!');
  } catch (err) { toast('Erro ao adicionar aula'); } finally { setLoading(false); }
};
```

### 2. Modificar condição da seção visual (linha ~1335)

Trocar `{isEditing && isBatch && (` por `{isEditing && (isBatch || isAdmin) && (` para que aulas isoladas também mostrem o botão.

---

## Resumo

| # | O que |
|---|-------|
| 1 | `handleAddBatchClass`: remover `if (!initialData?.batchId) return` e criar lote automaticamente |
| 2 | Conição visual: trocar `isBatch` por `isBatch \|\| isAdmin` |
