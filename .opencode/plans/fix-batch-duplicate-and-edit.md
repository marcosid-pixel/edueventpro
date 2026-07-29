# Plano: Corrigir duplicação de Aula 2 e falha ao editar após criar lote

## Problemas Diagnosticados

### Bug 1: Duas "Aula 2" criadas
- **Causa**: `initialData` é uma prop estática. Após `handleAddBatchClass` fazer PATCH no evento (adicionar batchId e renomear para "Aula 1"), `initialData.batchId` continua `undefined`.
- `batchEvents = isEditing && initialData?.batchId ? ... : []` → retorna array vazio
- `isBatch = false` → botão "Criar Lote e Adicionar Aula" reaparece
- Usuário clica de novo → cria segundo lote duplicado

### Bug 2: Não edita informações
- **Causa**: `formData.title` não é atualizado após o PATCH renomear para "(Aula 1)".
- Usuário clica "Salvar Edição" → `handleSubmit` envia título original → sobrescreve "(Aula 1)"

## Plano de Correção

### Arquivo: `src/views/EventForm.tsx`

#### 1. Adicionar state local `localBatchId`
```tsx
const [localBatchId, setLocalBatchId] = useState<string | null>(null);
```

#### 2. Criar `effectiveBatchId` derivado
```tsx
const effectiveBatchId = localBatchId || initialData?.batchId || null;
```

#### 3. Atualizar `batchEvents` para usar `effectiveBatchId`
```tsx
const batchEvents = isEditing && effectiveBatchId
  ? allEventsData.filter(e => e.batchId === effectiveBatchId).sort(...)
  : [];
```

#### 4. Atualizar `handleAddBatchClass`:
- Após PATCH de renomeação, atualizar `formData.title` para "(Aula 1)"
- Chamar `setLocalBatchId(batchId)` para manter o batchId local

#### 5. Atualizar referências a `initialData.batchId`:
- `handleSubmit` (linha 260): usar `effectiveBatchId`
- Toast message (linha 480): usar `effectiveBatchId`

## Verificação
- `npm run lint` → sem erros
- `npm run build` → sucesso
- Teste manual: criar evento isolado → clicar "Criar Lote" → verificar que:
  - Apenas UMA "Aula 2" é criada
  - Botão muda para "Gerenciar Lote"
  - Edição de campos funciona normalmente
