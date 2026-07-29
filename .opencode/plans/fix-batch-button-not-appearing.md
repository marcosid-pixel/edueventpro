# Plano: Botão "Adicionar Aula" não aparece após criar lote

## Problema
Após clicar "Criar Lote e Adicionar Aula", a UI continua mostrando "Criar Lote e Adicionar Aula" em vez da lista de aulas + botão "Adicionar Aula".

## Causa
`src/views/EventForm.tsx:109` — `isBatch = batchEvents.length > 1`

Após `handleAddBatchClass`:
- `effectiveBatchId` é setado via `setLocalBatchId` ✓
- Mas `allEventsData` (realtime collection) ainda não inclui o evento novo
- `batchEvents` filtra por `effectiveBatchId` → só encontra 1 evento (o original PATCHado)
- `1 > 1` = `false` → `isBatch = false` → UI errada

## Correção

**Arquivo:** `src/views/EventForm.tsx`  
**Linha 109:** Mudar de:
```js
const isBatch = batchEvents.length > 1;
```
para:
```js
const isBatch = !!effectiveBatchId;
```

Assim que `localBatchId` é setado, `effectiveBatchId` é truthy → `isBatch = true` → lista + botão aparecem imediatamente.

## Verificação
- `npm run lint` e `npm run build`
