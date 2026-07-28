import express from "express";
import bcrypt from "bcryptjs";
import { turso } from "./db.js";
import { z } from "zod";
import { sendEmail, passwordResetEmail } from "./email.js";

const router = express.Router();

import crypto from "crypto";

const signupSchema = z.object({
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/signup", async (req, res) => {
  try {
    const validated = signupSchema.parse(req.body);
    const { displayName, email, password } = validated;

    const id = `user_${Date.now()}`;
    const role = 'PROFESSOR';
    
    const hashedPassword = await bcrypt.hash(password, 10);

    await turso.execute(
      "INSERT INTO users (id, displayName, email, password, role) VALUES (?, ?, ?, ?, ?)",
      [id, displayName, email, hashedPassword, role],
    );

    if (req.session) req.session.userId = id;
    res.json({ user: { id, displayName, email, role } });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos. Verifique os campos e tente novamente." });
    }
    const message = err.message || "";
    if (message.includes("UNIQUE")) {
      return res.status(400).json({ error: "Este e-mail já está em uso" });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const validated = loginSchema.parse(req.body);
    const { email, password } = validated;

    const result = await turso.execute(
      "SELECT id, displayName, email, photoURL, role, workStart, workEnd, password FROM users WHERE email = ?",
      [email],
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = result.rows[0] as any;
    
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (req.session) req.session.userId = user.id as string;
    
    // Don't send password back
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos" });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/me", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ user: null });
  }

  try {
    const result = await turso.execute(
      "SELECT id, displayName, email, photoURL, role, workStart, workEnd FROM users WHERE id = ?",
      [req.session.userId],
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ user: null });
    }

    res.json({ user: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/reset-user-password", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  try {
    const adminCheck = await turso.execute("SELECT role FROM users WHERE id = ?", [req.session.userId]);
    if ((adminCheck.rows[0] as any)?.role !== 'ADMIN') {
      return res.status(403).json({ error: "Apenas administradores" });
    }
    
    const { userId, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "A nova senha deve ter no mínimo 8 caracteres" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await turso.execute("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/request-reset", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail obrigatório" });
    const result = await turso.execute("SELECT id, displayName, email FROM users WHERE email = ?", [email]);
    if (result.rows.length === 0) return res.json({ success: true });

    const user = result.rows[0] as any;
    
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "Servidor de e-mail não configurado" });
    }

    const token = crypto.randomUUID();
    await turso.execute("UPDATE users SET resetRequested = 0, resetToken = ? WHERE id = ?", [token, user.id]);
    
    let baseUrl = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : 'http://localhost:3000');
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    
    const emailHtml = passwordResetEmail(user.displayName, resetLink);

    await sendEmail({
      to: user.email,
      subject: "Redefinição de Senha - EduEvent Pro",
      html: emailHtml
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/send-reset-link", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Não autenticado" });
  try {
    const adminCheck = await turso.execute("SELECT role FROM users WHERE id = ?", [req.session.userId]);
    if ((adminCheck.rows[0] as any)?.role !== 'ADMIN') return res.status(403).json({ error: "Apenas administradores" });

    const { userId } = req.body;
    const userResult = await turso.execute("SELECT email, displayName FROM users WHERE id = ?", [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    const user = userResult.rows[0] as any;

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "Servidor de e-mail não configurado no .env" });
    }

    const token = crypto.randomUUID();
    await turso.execute("UPDATE users SET resetRequested = 0, resetToken = ? WHERE id = ?", [token, userId]);

    // Use environment variable or localhost as fallback
    const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    
    const emailHtml = passwordResetEmail(user.displayName, resetLink);

    await sendEmail({
      to: user.email,
      subject: "Redefinição de Senha - EduEvent Pro",
      html: emailHtml
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao enviar email:", err);
    res.status(500).json({ error: "Falha ao enviar e-mail. Verifique a configuração RESEND_API_KEY no .env" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Token inválido ou senha muito curta (mínimo 6 caracteres)" });
    }

    const userResult = await turso.execute("SELECT id FROM users WHERE resetToken = ?", [token]);
    if (userResult.rows.length === 0) return res.status(400).json({ error: "Link de redefinição inválido ou já utilizado" });
    const user = userResult.rows[0] as any;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await turso.execute("UPDATE users SET password = ?, resetToken = NULL WHERE id = ?", [hashedPassword, user.id]);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/logout", (req, res) => {
  if (req.session) req.session = null;
  res.json({ success: true });
});

export default router;
