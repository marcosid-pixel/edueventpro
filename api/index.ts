import express from "express";
import path from "path";
import cors from "cors";
import cookieSession from "cookie-session";
import rateLimit from "express-rate-limit";
// import removido para não quebrar no Vercel
import { initDb } from "./db.js";
import authRouter from "./auth.js";
import apiRouter from "./api.js";
import emailRouter from "./email-routes.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET é obrigatório. Defina no arquivo .env");
}

// Trust proxy - necessário no Vercel/serverless
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas de login. Tente novamente em 5 minutos." },
});
app.use("/api/auth/login", loginLimiter);

// Session configuration
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || 'fallback_secret_key'],
    maxAge: 24 * 60 * 60 * 1000,
    secure: false,
    sameSite: "lax",
    httpOnly: true,
  })
);

// Initialize DB (fire and forget - não bloqueia requests)
initDb().catch(err => console.error("DB init error:", err));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/emails", emailRouter);
app.use("/api", apiRouter);

// Vite / Static Files
async function setupFrontend() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Se não estiver rodando no Vercel, iniciamos o servidor normalmente
if (!process.env.VERCEL) {
  setupFrontend();
}

export default app;
