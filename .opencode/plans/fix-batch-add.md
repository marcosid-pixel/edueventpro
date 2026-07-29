# Fix: handleAddBatchClass não funciona para aulas isoladas

## Bug
O `POST /api/events` falha porque `formData` contém `isRecurring` e `recurringWeeks` que não existem na tabela `events`.

## Correção em `src/views/EventForm.tsx` (linha ~464)

Trocar:
```typescript
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
```

Por:
```typescript
      const dateStr = toLocalDateStr(nextDate);
      const { isRecurring, recurringWeeks, ...cleanPayload } = {
        ...formData, title: `${baseTitle} (Aula ${nextAulaNum})`, date: dateStr,
        time: `${formData.timeStart} - ${formData.timeEnd}`, status: 'Scheduled',
        createdBy: initialData.createdBy, teacher: formData.teacher, notificar_admin: 0,
        updatedAt: new Date().toISOString(), plataforma_meet: formData.plataforma_meet ? 1 : 0,
        meetLink: formData.meetLink || null, plataforma_comapos: formData.plataforma_comapos ? 1 : 0,
        convidado_externo: formData.convidado_externo ? 1 : 0, precisa_cabine: formData.precisa_cabine ? 1 : 0,
        category: formData.category, batchId
      };
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload)
      });
      if (!response.ok) throw new Error('Falha');
      toast(!initialData.batchId ? 'Lote criado! Aula adicionada.' : 'Aula adicionada ao lote!');
    } catch (err) { console.error(err); toast('Erro ao adicionar aula'); } finally { setLoading(false); }
```
