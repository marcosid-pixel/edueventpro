import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL || '',
    pass: process.env.SMTP_PASSWORD || ''
  }
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  try {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP não configurado. E-mail não enviado.');
      return false;
    }

    await transporter.sendMail({
      from: `"EduEvent Pro" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 500),
      headers: {
        'Reply-To': process.env.SMTP_EMAIL,
        'List-Unsubscribe': `<mailto:${process.env.SMTP_EMAIL}?subject=Cancelar%20inscricao>`,
        'Precedence': 'bulk',
        'X-Mailer': 'EduEvent-Pro/1.0'
      }
    });

    console.log(`E-mail enviado para ${to}: ${subject}`);
    return true;
  } catch (error: any) {
    console.error('Erro ao enviar e-mail:', error.message);
    return false;
  }
}

// --- Templates de E-mail ---

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="margin: 0; font-size: 24px; color: #1e293b; font-weight: 800;">EduEvent Pro</h1>
      <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Gestão Acadêmica</p>
    </div>
    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      ${content}
    </div>
    <div style="text-align: center; margin-top: 32px;">
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">
        Este é um e-mail automático do EduEvent Pro. Não responda.
      </p>
    </div>
  </div>
</body>
</html>
`;

// --- Templates Específicos ---

export function confirmationRequestEmail(
  userName: string,
  event: { title: string; date: string; timeStart?: string; timeEnd?: string; location?: string; course?: string },
  confirmUrl: string
): string {
  const dateFormatted = new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Olá, ${userName}</h2>
    <p style="color: #475569; line-height: 1.6;">
      Você tem uma aula pendente de confirmação. Por favor, confirme sua presença clicando no botão abaixo.
    </p>
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #4f46e5;">
      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Aula</span>
      <p style="margin: 4px 0 0; font-size: 16px; color: #1e293b; font-weight: 700;">${event.title}</p>
      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Data</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${dateFormatted}</p>
      ${event.timeStart ? `<span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Horário</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.timeStart} - ${event.timeEnd || ''}</p>` : ''}
      ${event.location ? `<span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Local</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.location}</p>` : ''}
      ${event.course ? `<span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Departamento</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.course}</p>` : ''}
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${confirmUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Confirmar Presença</a>
    </div>
    <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
      <strong>Importante:</strong> Você tem até 5 dias após a data da aula para confirmar. Após este prazo, a aula será confirmada automaticamente.
    </p>
    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
      Se você não pode comparecer, entre em contato com o administrador.
    </p>
  `;

  return baseTemplate(content);
}

export function confirmationSuccessEmail(
  userName: string,
  event: { title: string; date: string; timeStart?: string; timeEnd?: string; location?: string }
): string {
  const dateFormatted = new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Presença Confirmada!</h2>
    <p style="color: #475569; line-height: 1.6;">
      Olá, ${userName}! Sua presença foi confirmada com sucesso para a aula abaixo:
    </p>
    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #22c55e;">
      <span style="font-size: 12px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">Aula Confirmada</span>
      <p style="margin: 4px 0 0; font-size: 16px; color: #1e293b; font-weight: 700;">${event.title}</p>
      <span style="font-size: 12px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">Data</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${dateFormatted}</p>
      ${event.timeStart ? `<span style="font-size: 12px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">Horário</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.timeStart} - ${event.timeEnd || ''}</p>` : ''}
      ${event.location ? `<span style="font-size: 12px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">Local</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.location}</p>` : ''}
    </div>
    <p style="color: #475569; line-height: 1.6;">
      Obrigado por confirmar sua presença. Até a aula!
    </p>
  `;

  return baseTemplate(content);
}

export function eventCreatedEmail(
  userName: string,
  event: { title: string; date: string; timeStart?: string; timeEnd?: string; location?: string; course?: string }
): string {
  const dateFormatted = new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Novo Agendamento</h2>
    <p style="color: #475569; line-height: 1.6;">
      Olá, ${userName}! Uma nova aula foi agendada para você:
    </p>
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #4f46e5;">
      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Aula</span>
      <p style="margin: 4px 0 0; font-size: 16px; color: #1e293b; font-weight: 700;">${event.title}</p>
      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Data</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${dateFormatted}</p>
      ${event.timeStart ? `<span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Horário</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.timeStart} - ${event.timeEnd || ''}</p>` : ''}
      ${event.location ? `<span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Local</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.location}</p>` : ''}
      ${event.course ? `<span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Departamento</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.course}</p>` : ''}
    </div>
    <p style="color: #475569; line-height: 1.6;">
      Você receberá um e-mail de confirmação após a data da aula.
    </p>
  `;

  return baseTemplate(content);
}

export function eventCancelledEmail(
  userName: string,
  event: { title: string; date: string; timeStart?: string; timeEnd?: string; location?: string },
  reason?: string
): string {
  const dateFormatted = new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Aula Cancelada</h2>
    <p style="color: #475569; line-height: 1.6;">
      Olá, ${userName}! A aula abaixo foi cancelada:
    </p>
    <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #ef4444;">
      <span style="font-size: 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">Aula Cancelada</span>
      <p style="margin: 4px 0 0; font-size: 16px; color: #1e293b; font-weight: 700;">${event.title}</p>
      <span style="font-size: 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">Data</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${dateFormatted}</p>
      ${event.timeStart ? `<span style="font-size: 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">Horário</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.timeStart} - ${event.timeEnd || ''}</p>` : ''}
      ${event.location ? `<span style="font-size: 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">Local</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.location}</p>` : ''}
    </div>
    ${reason ? `
    <div style="background-color: #fffbeb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <span style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Motivo</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #92400e;">${reason}</p>
    </div>
    ` : ''}
    <p style="color: #475569; line-height: 1.6;">
      Entre em contato com o administrador para mais informações.
    </p>
  `;

  return baseTemplate(content);
}

export function eventReminderEmail(
  userName: string,
  event: { title: string; date: string; timeStart?: string; timeEnd?: string; location?: string; course?: string }
): string {
  const dateFormatted = new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Lembrete de Aula</h2>
    <p style="color: #475569; line-height: 1.6;">
      Olá, ${userName}! Você tem uma aula amanhã. Não esqueça de confirmar sua presença!
    </p>
    <div style="background-color: #fffbeb; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #f59e0b;">
      <span style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Amanhã</span>
      <p style="margin: 4px 0 0; font-size: 16px; color: #1e293b; font-weight: 700;">${event.title}</p>
      <span style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Data</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${dateFormatted}</p>
      ${event.timeStart ? `<span style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Horário</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.timeStart} - ${event.timeEnd || ''}</p>` : ''}
      ${event.location ? `<span style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Local</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.location}</p>` : ''}
    </div>
    <p style="color: #475569; line-height: 1.6;">
      Após a aula, você terá 5 dias para confirmar sua presença no sistema.
    </p>
  `;

  return baseTemplate(content);
}

export function passwordResetEmail(
  userName: string,
  resetUrl: string
): string {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Redefinição de Senha</h2>
    <p style="color: #475569; line-height: 1.6;">
      Olá, ${userName}! Você solicitou a redefinição da sua senha no EduEvent Pro.
    </p>
    <p style="color: #475569; line-height: 1.6;">
      Clique no botão abaixo para criar sua nova senha com segurança:
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Criar Nova Senha</a>
    </div>
    <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
      <strong>Importante:</strong> Este link é válido por 24 horas e pode ser utilizado apenas uma vez.
    </p>
    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
      Se você não solicitou isso, pode ignorar este e-mail. Sua senha atual não será alterada.
    </p>
  `;

  return baseTemplate(content);
}

export function autoConfirmationEmail(
  userName: string,
  event: { title: string; date: string; timeStart?: string; timeEnd?: string; location?: string }
): string {
  const dateFormatted = new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Aula Confirmada Automaticamente</h2>
    <p style="color: #475569; line-height: 1.6;">
      Olá, ${userName}! A aula abaixo foi confirmada automaticamente, pois o prazo de 5 dias para confirmação manual expirou.
    </p>
    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #22c55e;">
      <span style="font-size: 12px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">Confirmada Automaticamente</span>
      <p style="margin: 4px 0 0; font-size: 16px; color: #1e293b; font-weight: 700;">${event.title}</p>
      <span style="font-size: 12px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">Data</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${dateFormatted}</p>
      ${event.timeStart ? `<span style="font-size: 12px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">Horário</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.timeStart} - ${event.timeEnd || ''}</p>` : ''}
      ${event.location ? `<span style="font-size: 12px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">Local</span>
      <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">${event.location}</p>` : ''}
    </div>
    <p style="color: #475569; line-height: 1.6;">
      Caso tenha ocorrido algum erro, entre em contato com o administrador.
    </p>
  `;

  return baseTemplate(content);
}
