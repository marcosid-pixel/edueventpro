import express from "express";
import crypto from "crypto";
import { turso } from "./db.js";
import {
  sendEmail,
  confirmationRequestEmail,
  confirmationSuccessEmail,
  eventCreatedEmail,
  eventCancelledEmail,
  eventReminderEmail,
  autoConfirmationEmail
} from "./email.js";

const router = express.Router();

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  next();
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const userResult = await turso.execute("SELECT role FROM users WHERE id = ?", [req.session!.userId]);
    const role = (userResult.rows[0] as any)?.role;
    if (role !== 'ADMIN') {
      return res.status(403).json({ error: "Apenas administradores podem executar esta ação" });
    }
    next();
  } catch {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// Enviar e-mail de confirmação para o professor
router.post("/send-confirmation/:eventId", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Buscar evento
    const eventResult = await turso.execute("SELECT * FROM events WHERE id = ?", [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }
    const event = eventResult.rows[0] as any;

    // Buscar professor (teacher do evento)
    if (!event.teacher) {
      return res.status(400).json({ error: "Evento não possui professor atribuído" });
    }

    const teacherResult = await turso.execute("SELECT id, email, displayName FROM users WHERE displayName = ?", [event.teacher]);
    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: "Professor não encontrado" });
    }
    const teacher = teacherResult.rows[0] as any;

    if (!teacher.email) {
      return res.status(400).json({ error: "Professor não possui e-mail cadastrado" });
    }

    // Verificar se já existe token válido
    const existingToken = await turso.execute(
      "SELECT id FROM confirmation_tokens WHERE eventId = ? AND userId = ? AND used = 0 AND expiresAt > datetime('now')",
      [eventId, teacher.id]
    );

    let token: string;
    if (existingToken.rows.length > 0) {
      // Reusar token existente
      const existingRow = (await turso.execute(
        "SELECT token FROM confirmation_tokens WHERE eventId = ? AND userId = ? AND used = 0 AND expiresAt > datetime('now')",
        [eventId, teacher.id]
      )).rows[0] as any;
      token = existingRow.token;
    } else {
      // Criar novo token
      token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias

      await turso.execute(
        "INSERT INTO confirmation_tokens (id, eventId, userId, token, expiresAt) VALUES (?, ?, ?, ?, ?)",
        [`ct_${Date.now()}`, eventId, teacher.id, token, expiresAt]
      );
    }

    // Montar URL de confirmação
    const baseUrl = process.env.CORS_ORIGIN || process.env.BASE_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/confirm/${token}`;

    // Enviar e-mail
    const emailHtml = confirmationRequestEmail(teacher.displayName, {
      title: event.title,
      date: event.date,
      timeStart: event.timeStart,
      timeEnd: event.timeEnd,
      location: event.location,
      course: event.course
    }, confirmUrl);

    const sent = await sendEmail({
      to: teacher.email,
      subject: `Confirmação de Aula: ${event.title}`,
      html: emailHtml
    });

    if (!sent) {
      return res.status(500).json({ error: "Falha ao enviar e-mail. Verifique a configuração SMTP_EMAIL." });
    }

    // Criar notificação no sistema
    await turso.execute(
      "INSERT INTO notifications (id, title, message, type, userId) VALUES (?, ?, ?, ?, ?)",
      [
        `notif_email_${Date.now()}`,
        'E-mail de Confirmação Enviado',
        `E-mail enviado para ${teacher.displayName} solicitando confirmação da aula "${event.title}"`,
        'info',
        req.session!.userId
      ]
    );

    res.json({ success: true, message: `E-mail enviado para ${teacher.email}` });
  } catch (err: any) {
    console.error("Erro ao enviar e-mail de confirmação:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Enviar lembrete de evento
router.post("/send-reminder/:eventId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventResult = await turso.execute("SELECT * FROM events WHERE id = ?", [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }
    const event = eventResult.rows[0] as any;

    if (!event.teacher) {
      return res.status(400).json({ error: "Evento não possui professor atribuído" });
    }

    const teacherResult = await turso.execute("SELECT email, displayName FROM users WHERE displayName = ?", [event.teacher]);
    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: "Professor não encontrado" });
    }
    const teacher = teacherResult.rows[0] as any;

    if (!teacher.email) {
      return res.status(400).json({ error: "Professor não possui e-mail cadastrado" });
    }

    const emailHtml = eventReminderEmail(teacher.displayName, {
      title: event.title,
      date: event.date,
      timeStart: event.timeStart,
      timeEnd: event.timeEnd,
      location: event.location,
      course: event.course
    });

    const sent = await sendEmail({
      to: teacher.email,
      subject: `Lembrete: Aula amanhã - ${event.title}`,
      html: emailHtml
    });

    if (!sent) {
      return res.status(500).json({ error: "Falha ao enviar e-mail" });
    }

    res.json({ success: true, message: `Lembrete enviado para ${teacher.email}` });
  } catch (err: any) {
    console.error("Erro ao enviar lembrete:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Confirmar presença via token (rota pública)
router.get("/confirm/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Buscar token
    const tokenResult = await turso.execute(
      "SELECT * FROM confirmation_tokens WHERE token = ? AND used = 0",
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: "Token inválido ou já utilizado" });
    }

    const tokenData = tokenResult.rows[0] as any;

    // Verificar expiração
    if (new Date(tokenData.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Token expirado. Solicite um novo e-mail de confirmação." });
    }

    // Buscar evento
    const eventResult = await turso.execute("SELECT * FROM events WHERE id = ?", [tokenData.eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }
    const event = eventResult.rows[0] as any;

    // Buscar professor
    const teacherResult = await turso.execute("SELECT email, displayName FROM users WHERE id = ?", [tokenData.userId]);
    const teacher = teacherResult.rows[0] as any;

    // Atualizar status do evento para Confirmado
    await turso.execute(
      "UPDATE events SET status = 'Confirmed', updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [tokenData.eventId]
    );

    // Marcar token como usado
    await turso.execute(
      "UPDATE confirmation_tokens SET used = 1 WHERE id = ?",
      [tokenData.id]
    );

    // Enviar e-mail de confirmação recebida
    if (teacher?.email) {
      const emailHtml = confirmationSuccessEmail(teacher.displayName, {
        title: event.title,
        date: event.date,
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
        location: event.location
      });

      await sendEmail({
        to: teacher.email,
        subject: `Presença Confirmada: ${event.title}`,
        html: emailHtml
      });
    }

    // Criar notificação
    await turso.execute(
      "INSERT INTO notifications (id, title, message, type, userId) VALUES (?, ?, ?, ?, ?)",
      [
        `notif_confirmed_${Date.now()}`,
        'Aula Confirmada',
        `${teacher?.displayName || 'Professor'} confirmou presença na aula "${event.title}"`,
        'success',
        tokenData.userId
      ]
    );

    res.json({
      success: true,
      message: "Presença confirmada com sucesso!",
      event: {
        title: event.title,
        date: event.date,
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
        location: event.location
      }
    });
  } catch (err: any) {
    console.error("Erro ao confirmar presença:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Enviar e-mail quando evento é criado (chamado pelo frontend)
router.post("/event-created", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.body;

    const eventResult = await turso.execute("SELECT * FROM events WHERE id = ?", [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }
    const event = eventResult.rows[0] as any;

    if (!event.teacher) {
      return res.json({ success: true, message: "Sem professor atribuído, e-mail não enviado" });
    }

    const teacherResult = await turso.execute("SELECT email, displayName FROM users WHERE displayName = ?", [event.teacher]);
    if (teacherResult.rows.length === 0) {
      return res.json({ success: true, message: "Professor não encontrado no sistema" });
    }
    const teacher = teacherResult.rows[0] as any;

    if (!teacher.email) {
      return res.json({ success: true, message: "Professor sem e-mail cadastrado" });
    }

    const emailHtml = eventCreatedEmail(teacher.displayName, {
      title: event.title,
      date: event.date,
      timeStart: event.timeStart,
      timeEnd: event.timeEnd,
      location: event.location,
      course: event.course
    });

    const sent = await sendEmail({
      to: teacher.email,
      subject: `Novo Agendamento: ${event.title}`,
      html: emailHtml
    });

    res.json({ success: true, emailSent: sent });
  } catch (err: any) {
    console.error("Erro ao enviar e-mail de criação:", err);
    res.json({ success: true, emailSent: false });
  }
});

// Enviar e-mail quando evento é cancelado (chamado pelo frontend)
router.post("/event-cancelled", requireAuth, async (req, res) => {
  try {
    const { eventId, reason } = req.body;

    const eventResult = await turso.execute("SELECT * FROM events WHERE id = ?", [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }
    const event = eventResult.rows[0] as any;

    if (!event.teacher) {
      return res.json({ success: true, message: "Sem professor atribuído" });
    }

    const teacherResult = await turso.execute("SELECT email, displayName FROM users WHERE displayName = ?", [event.teacher]);
    if (teacherResult.rows.length === 0) {
      return res.json({ success: true, message: "Professor não encontrado" });
    }
    const teacher = teacherResult.rows[0] as any;

    if (!teacher.email) {
      return res.json({ success: true, message: "Professor sem e-mail" });
    }

    const emailHtml = eventCancelledEmail(teacher.displayName, {
      title: event.title,
      date: event.date,
      timeStart: event.timeStart,
      timeEnd: event.timeEnd,
      location: event.location
    }, reason);

    const sent = await sendEmail({
      to: teacher.email,
      subject: `Aula Cancelada: ${event.title}`,
      html: emailHtml
    });

    res.json({ success: true, emailSent: sent });
  } catch (err: any) {
    console.error("Erro ao enviar e-mail de cancelamento:", err);
    res.json({ success: true, emailSent: false });
  }
});

// Verificar status de um token
router.get("/token-status/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const tokenResult = await turso.execute(
      "SELECT ct.*, e.title as eventTitle, e.date as eventDate, e.timeStart, e.timeEnd, e.location FROM confirmation_tokens ct JOIN events e ON ct.eventId = e.id WHERE ct.token = ?",
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.json({ valid: false, error: "Token não encontrado" });
    }

    const tokenData = tokenResult.rows[0] as any;

    if (tokenData.used) {
      return res.json({ valid: false, error: "Token já utilizado", used: true });
    }

    if (new Date(tokenData.expiresAt) < new Date()) {
      return res.json({ valid: false, error: "Token expirado", expired: true });
    }

    res.json({
      valid: true,
      event: {
        title: tokenData.eventTitle,
        date: tokenData.eventDate,
        timeStart: tokenData.timeStart,
        timeEnd: tokenData.timeEnd,
        location: tokenData.location
      }
    });
  } catch (err: any) {
    console.error("Erro ao verificar token:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
