# Plano: 3 Correções — Perfil Admin, Horário de Trabalho, E-mails

---

## Problema 1: Perfil Admin genérico (Total, Horas, Cursos)

### Onde
`src/components/dashboard/ProfileSidebar.tsx` — linhas 105-125

### O que acontece
O sidebar do perfil mostra 3 métricas genéricas para admin:
- Total (quantidade total de eventos)
- Horas (soma de horas de todos os eventos)
- Cursos (cursos únicos)

Essas métricas não fazem sentido para um admin — ele precisa de uma visão mais completa do sistema.

### Solução
Redesignar a seção de métricas do admin para mostrar informações mais relevantes:

**Métricas para Admin (substituir grid de 3 colunas):**
1. **Professores** — quantidade de usuários com role PROFESSOR
2. **Aulas Hoje** — eventos com date = hoje
3. **Pendentes** — eventos com status PENDING_CONFIRMATION
4. **Cancelados** — eventos com status Cancelled

**Seção adicional (opcional) — resumo rápido:**
- Próximo evento do dia
- Total de eventos este mês

### Arquivos a modificar
- `src/components/dashboard/ProfileSidebar.tsx` — adicionar contadores de admin

---

## Problema 2: Horário de trabalho não salva visualmente

### Onde
`src/components/dashboard/ProfileSidebar.tsx` — linhas 35-36

### O que acontece
```typescript
const workStart = '09:00';  // HARDCODED
const workEnd = '18:00';    // HARDCODED
```
O valor é salvo corretamente no banco (PATCH `/api/users/:id` funciona), mas o ProfileSidebar sempre mostra "09:00" e "18:00" porque lê de variáveis hardcoded, não do objeto `user`.

### Solução
Alterar linhas 35-36 para:
```typescript
const workStart = user?.workStart || '09:00';
const workEnd = user?.workEnd || '18:00';
```

### Arquivo a modificar
- `src/components/dashboard/ProfileSidebar.tsx` — 2 linhas

---

## Problema 3: E-mails não são enviados ao professor

### Onde
- `src/views/EventForm.tsx` — nunca chama as rotas de e-mail
- `api/email.ts` — variáveis de ambiente erradas
- `.env.example` — documenta RESEND_API_KEY mas o código usa SMTP

### O que acontece (3 causas raiz)

**Causa A — Frontend nunca chama as rotas de e-mail:**
As rotas `/api/emails/event-created`, `/api/emails/event-cancelled` existem em `api/email-routes.ts`, mas o `EventForm.tsx` nunca faz `fetch` para essas rotas ao criar/editar/cancelar um evento.

**Causa B — Variáveis de ambiente erradas:**
- `api/email.ts` usa `process.env.SMTP_EMAIL` e `process.env.SMTP_PASSWORD` (Gmail SMTP)
- `.env.example` documenta `RESEND_API_KEY` (Resend API)
- Resultado: mesmo se o frontend chamasse as rotas, o `sendEmail()` falharia

**Causa C — Password reset verifica variável errada:**
`api/auth.ts` linhas 145/182 verificam `process.env.RESEND_API_KEY` mas chama `sendEmail()` que lê `SMTP_EMAIL`/`SMTP_PASSWORD`.

### Solução

**A) Conectar frontend às rotas de e-mail:**
Em `EventForm.tsx`, após cada operação bem-sucedida, chamar a rota correspondente:

1. **Após criar evento** (linha ~303, após `await createEvent(formData.date)`):
```typescript
// Enviar e-mail de notificação ao professor
if (formData.teacher) {
  try {
    const createdEvent = await response.json();
    await fetch('/api/emails/event-created', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: createdEvent.id })
    });
  } catch (e) { /* falha silenciosa — e-mail é opcional */ }
}
```

2. **Após cancelar aula** (linha ~706, após toast de sucesso):
```typescript
await fetch('/api/emails/event-cancelled', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eventId: initialData.id, reason: cancelReason })
});
```

3. **Após reagendar** (linha ~169, após toast de sucesso):
```typescript
await fetch('/api/emails/event-created', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eventId: initialData.id })
});
```

**B) Corrigir variáveis de ambiente:**
- Manter `api/email.ts` usando `SMTP_EMAIL`/`SMTP_PASSWORD` (Gmail funciona bem)
- Atualizar `.env.example` para documentar as variáveis corretas:
```
SMTP_EMAIL=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app-do-gmail
```

**C) Corrigir auth.ts:**
Em `api/auth.ts` linhas 145 e 182, trocar `process.env.RESEND_API_KEY` por `process.env.SMTP_EMAIL`.

**D) Adicionar coluna `pending_delete` na migração:**
Em `api/db.ts`, adicionar ao array `columnsToEnsure`:
```typescript
{ table: 'users', column: 'pending_delete', type: 'BOOLEAN DEFAULT 0' },
```

---

## Problema 4: E-mails caindo na caixa de spam

### Onde
`api/email.ts` — configuração do transporter e templates

### O que acontece
E-mails enviados via Gmail SMTP estão caindo na caixa de spam dos destinatários. Causas comuns:
1. Cabeçalhos HTTP ausentes (Reply-To, List-Unsubscribe, Precedence)
2. Templates HTML sem texto plain-text alternativo
3. Gmail limita envio de contas pessoais (limite de 500/dia, pode ser marcado como spam)
4. Ausência de registro SPF/DKIM personalizado (depende da configuração do domínio)

### Solução

**A) Adicionar cabeçalhos anti-spam no transporter (`api/email.ts`):**
```typescript
await transporter.sendMail({
  from: `"EduEvent Pro" <${process.env.SMTP_EMAIL}>`,
  to,
  subject,
  html,
  headers: {
    'Reply-To': process.env.SMTP_EMAIL,
    'List-Unsubscribe': `<mailto:${process.env.SMTP_EMAIL}?subject=Cancelar%20inscricao>`,
    'Precedence': 'bulk',
    'X-Mailer': 'EduEvent-Pro/1.0'
  }
});
```

**B) Adicionar texto plain-text aos templates (`api/email.ts`):**
O Gmail considera spam e-mails que só têm HTML sem alternativa plain-text. Adicionar campo `text` ao `sendEmail`:
```typescript
interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;  // <-- adicionar
}
```
E gerar versão plain-text resumida de cada template.

**C) Melhorar templates para evitar filtros de spam:**
- Remover caracteres como "!!!", emojis excessivos, palavras em CAPS LOCK
- Manter linguagem profissional e direta
- Adicionar rodapé com endereço físico (se disponível) — requisito CAN-SPAM

**D) Configuração recomendada no `.env.example`:**
```
# Gmail SMTP (use Senha de App, não senha regular)
# Como gerar: https://myaccount.google.com/apppasswords
SMTP_EMAIL=seu-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Opcional: domínio próprio (melhor para evitar spam)
# SMTP_HOST=smtp.seudominio.com
# SMTP_PORT=587
```

### Arquivo a modificar
- `api/email.ts` — headers + plain-text + templates

---

## Resumo de todos os arquivos a modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/dashboard/ProfileSidebar.tsx` | Métricas admin + fix workStart/workEnd |
| `src/views/EventForm.tsx` | Chamar rotas de e-mail após criar/cancelar/reagendar |
| `api/email.ts` | Headers anti-spam + plain-text + templates |
| `api/auth.ts` | Trocar RESEND_API_KEY por SMTP_EMAIL nas verificações |
| `api/db.ts` | Adicionar coluna pending_delete na migração |
| `.env.example` | Documentar SMTP_EMAIL/SMTP_PASSWORD corretamente |

---

## Ordem de execução
1. ProfileSidebar.tsx (fix workStart/workEnd + métricas admin)
2. EventForm.tsx (chamar rotas de e-mail)
3. api/email.ts (headers anti-spam + plain-text)
4. api/auth.ts (corrigir variável de ambiente)
5. api/db.ts (adicionar pending_delete)
6. .env.example (documentar variáveis corretas)
