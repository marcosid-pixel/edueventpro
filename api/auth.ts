import express from "express";
import bcrypt from "bcryptjs";
import { turso } from "./db.js";
import { z } from "zod";

const router = express.Router();

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

router.post("/logout", (req, res) => {
  if (req.session) req.session = null;
  res.json({ success: true });
});

export default router;
