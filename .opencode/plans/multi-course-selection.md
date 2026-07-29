# Plano: Multi-seleção de Cursos no EventForm

## Objetivo
1. Adicionar "Engenharia da Computação" à lista de cursos
2. Permitir selecionar múltiplos cursos por evento (multi-select)
3. Campo opcional (pode deixar vazio)
4. Manter retrocompatibilidade com eventos existentes (curso único)

## Estratégia
- Armazenar como string separado por vírgula na coluna `course` existente (TEXT)
- Ex: `"Ciência da Computação, Engenharia da Computação"`
- Eventos antigos com curso único continuam funcionando normalmente

## Alterações

### 1. `src/constants.ts`
- Adicionar `'Engenharia da Computação'` ao array `ACADEMIC_COURSES` (linha ~40, após Engenharia Elétrica)

### 2. `src/utils/index.ts` — `getCourseStyle()`
- Adaptar para receber string com múltiplos cursos separados por vírgula
- Retornar estilo do **primeiro curso** encontrado (para ícone/borda)
- Para exibição de texto, usar abreviações: `"CC, EC"` ao invés do nome completo

### 3. `src/views/EventForm.tsx` — UI de seleção
- Trocar `<select>` único (linha 1023-1032) por **multi-select com checkboxes**
- Componente: dropdown que abre ao clicar, com checkboxes para cada curso
- Cursos selecionados aparecem como **chips/tags** abaixo do campo
- `formData.course` continua sendo string (comma-separated)
- Estado local adicional: `selectedCourses: string[]` para controlar a UI

### 4. `src/views/EventForm.tsx` — `formData.course`
- Manter como `string` (comma-separated) para retrocompatibilidade
- Ao marcar/desmarcar curso: atualizar `formData.course` com `.join(', ')`
- Ao carregar evento existente: fazer `.split(', ')` para popular `selectedCourses`

### 5. `src/views/EventForm.tsx` — Categoria
- Quando múltiplos cursos selecionados, mostrar categorias do **primeiro curso** selecionado
- Ou unir categorias de todos os cursos selecionados

### 6. Locais que usam `event.course` para filtro/comparação
Filtrar com `.includes()` ou `.split(',')` para checar se o evento pertence a um curso:
- `src/views/Dashboard.tsx` — courseDistribution (linha ~123-125): iterar sobre cada curso do evento
- `src/views/CourseManagementView.tsx` — `events.filter(e => e.course === courseName)` (linha ~260, 329-332, etc.): usar `.includes()` ou `.split(',').includes()`
- `src/views/CourseHistoryView.tsx` — agrupamento por curso (linha ~28-30)
- `src/views/ScheduleHub.tsx` — filtro por curso (linha ~279)
- `src/components/dashboard/NextEventCard.tsx` — exibição (linha ~46)
- `src/components/dashboard/TodayTimeline.tsx` — exibição (linha ~126)
- `src/views/LogsView.tsx` — exibição de courseName (linha ~340, 559)
- `src/views/UnifiedCalendar.tsx` — exibição (linha ~188)

### 7. Emails (`api/email.ts`, `api/email-routes.ts`)
- `event.course` já é exibido como texto simples → funciona com comma-separated
- Não precisa de mudança significativa

## Helper functions a criar

```ts
// src/utils/index.ts
export const parseCourses = (courseStr: string): string[] => {
  if (!courseStr) return [];
  return courseStr.split(',').map(c => c.trim()).filter(Boolean);
};

export const coursesMatch = (eventCourse: string, filterCourse: string): boolean => {
  return parseCourses(eventCourse).some(c => 
    c.toLowerCase() === filterCourse.toLowerCase()
  );
};
```

## UI do Multi-Select (EventForm)

```
┌─────────────────────────────────────────┐
│ CURSOS RELACIONADOS                     │
│ ┌─────────────────────────────────────┐ │
│ │ [CC] [EC]           ▼ (abrir)      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ □ Ciência da Computação                 │
│ ☑ Engenharia da Computação              │
│ ☑ Engenharia Civil                      │
│ □ Engenharia de Produção                │
│ □ Engenharia Elétrica                   │
│ □ ...                                   │
└─────────────────────────────────────────┘
```

- Cursos selecionados: chips coloridos removíveis (×)
- Dropdown com checkbox para cada opção
- Click fora fecha o dropdown

## Ordem de implementação
1. constants.ts — adicionar Eng. Computação
2. utils/index.ts — helpers `parseCourses`, `coursesMatch`, atualizar `getCourseStyle`
3. EventForm.tsx — multi-select UI + lógica de formData.course
4. Atualizar filtros nos demais arquivos (Dashboard, CourseManagement, etc.)
5. Lint + Build

## Verificação
- Criar evento com 1 curso → funciona como antes
- Criar evento com 2+ cursos → salva como `"CC, EC"` no banco
- Abrir evento existente (curso único) → chip único aparece
- Filtrar por curso nos cards → eventos multi-curso aparecem em todos os cards relevantes
