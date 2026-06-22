import express from "express";
import bcrypt from "bcryptjs";
import { turso } from "./db.js";
import { z } from "zod";
import nodemailer from "nodemailer";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL || '',
    pass: process.env.SMTP_PASSWORD || ''
  }
});

const signupSchema = z.object({
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
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
      return res.status(400).json({ error: (err as any).errors[0].message });
    }
    const message = err.message || "";
    if (message.includes("UNIQUE")) {
      return res.status(400).json({ error: "Este e-mail já está em uso" });
    }
    res.status(500).json({ error: `Erro no servidor: ${message}` });
  }
});

router.post("/login", async (req, res) => {
  try {
    const validated = loginSchema.parse(req.body);
    const { email, password } = validated;

    const result = await turso.execute(
      "SELECT * FROM users WHERE email = ?",
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
      return res.status(400).json({ error: (err as any).errors[0].message });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ user: null });
  }

  try {
    const result = await turso.execute(
      "SELECT id, displayName, email, photoURL, role FROM users WHERE id = ?",
      [req.session.userId],
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ user: null });
    }

    res.json({ user: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await turso.execute("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/request-reset", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail obrigatório" });
    const result = await turso.execute("SELECT id, displayName FROM users WHERE email = ?", [email]);
    if (result.rows.length === 0) return res.json({ success: true }); // pretend it worked for security

    const user = result.rows[0] as any;
    await turso.execute("UPDATE users SET resetRequested = 1 WHERE id = ?", [user.id]);
    
    // Create an alert notification for the admin
    const notifId = `notif_${Date.now()}`;
    await turso.execute(
      `INSERT INTO notifications (id, title, message, type) VALUES (?, ?, ?, ?)`,
      [notifId, "Solicitação de Redefinição de Senha", `O usuário ${user.displayName} (${email}) solicitou a redefinição de senha. Vá para a Governança de Usuários para enviar o link.`, "alert"]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      return res.status(500).json({ error: "Servidor SMTP não configurado no .env" });
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await turso.execute("UPDATE users SET resetRequested = 0, resetToken = ? WHERE id = ?", [token, userId]);

    // Use environment variable or localhost as fallback
    const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    
    await transporter.sendMail({
      from: `"EduEvent Pro" <${process.env.SMTP_EMAIL}>`,
      to: user.email,
      subject: "Redefinição de Senha - EduEvent Pro",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Olá, ${user.displayName}!</h2>
          <p>Você (ou um administrador) solicitou a redefinição da sua senha no EduEvent Pro.</p>
          <p>Clique no botão abaixo para criar sua nova senha com segurança:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
            Criar Nova Senha
          </a>
          <p>Se você não solicitou isso, pode ignorar este e-mail. Este link é válido apenas para uma utilização.</p>
        </div>
      `
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao enviar email:", err);
    res.status(500).json({ error: "Falha ao enviar e-mail. Verifique suas credenciais do Gmail no .env" });
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
    res.status(500).json({ error: err.message });
  }
});

router.post("/logout", (req, res) => {
  if (req.session) req.session = null;
  res.json({ success: true });
});

export default router;
