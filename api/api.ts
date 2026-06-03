import express from "express";
import { turso } from "./db.js";

const router = express.Router();

const ALLOWED_TABLES = ['users', 'courses', 'events', 'speakers', 'notifications', 'activity_logs'];
const VALID_COLUMN_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function sanitizeFields(fields: string[]): string[] {
  for (const f of fields) {
    if (!VALID_COLUMN_RE.test(f)) {
      throw new Error(`Nome de coluna inválido: '${f}'`);
    }
  }
  return fields;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  next();
}

function validateTable(req: express.Request, res: express.Response, next: express.NextFunction) {
  const table = req.params.table;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: `Tabela '${table}' não permitida` });
  }
  next();
}

router.use(requireAuth);

// --- Notifications ---

router.get("/notifications", async (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await turso.execute("DELETE FROM notifications WHERE updatedAt < ?", [yesterday]);
    
    const result = await turso.execute("SELECT * FROM notifications ORDER BY updatedAt DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/notifications", async (req, res) => {
  try {
    const fields = sanitizeFields(Object.keys(req.body));
    const placeholders = fields.map(() => "?").join(", ");
    const columns = fields.join(", ");
    const id = req.body.id || `notif_${Date.now()}`;
    const args = [id, ...Object.values(req.body)];

    await turso.execute(
      `INSERT INTO notifications (id, ${columns}) VALUES (?, ${placeholders})`,
      args
    );

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await turso.execute("DELETE FROM notifications WHERE updatedAt < ?", [yesterday]);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/notifications_read/:id", async (req, res) => {
  try {
    await turso.execute("UPDATE notifications SET isRead = 1 WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/notifications_read_all", async (req, res) => {
  try {
    await turso.execute("UPDATE notifications SET isRead = 1");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Logs (must come before generic CRUD) ---

router.delete("/activity_logs/all", async (req, res) => {
  try {
    await turso.execute("DELETE FROM activity_logs");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/activity_logs", async (req, res) => {
  try {
    const result = await turso.execute("SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT 500");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/activity_logs", async (req, res) => {
  try {
    const id = req.body.id || `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const fields = sanitizeFields(Object.keys(req.body).filter(k => k !== 'id'));
    const placeholders = fields.map(() => "?").join(", ");
    const columns = fields.join(", ");
    const args = [id, ...fields.map(f => req.body[f])] as any[];
    await turso.execute(
      `INSERT INTO activity_logs (id, ${columns}) VALUES (?, ${placeholders})`,
      args
    );
    res.json({ id, ...req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Generic CRUD Proxy ---

router.get("/:table", validateTable, async (req, res) => {
  const { table } = req.params;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;
  try {
    const result = await turso.execute(`SELECT * FROM ${table} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`, [limit, offset]);
    res.json(result.rows);
  } catch (err: any) {
    try {
      const result = await turso.execute(`SELECT * FROM ${table} ORDER BY createdAt DESC LIMIT ? OFFSET ?`, [limit, offset]);
      res.json(result.rows);
    } catch (err2: any) {
      res.status(500).json({ error: err.message });
    }
  }
});

router.get("/:table/:id", validateTable, async (req, res) => {
  const { table, id } = req.params;
  try {
    const result = await turso.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    res.json(result.rows[0] || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:table", validateTable, async (req, res) => {
  const { table } = req.params;
  const fields = sanitizeFields(Object.keys(req.body));
  const placeholders = fields.map(() => "?").join(", ");
  const columns = fields.join(", ");
  
  try {
    const id = req.body.id || `${table}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const args = [...Object.values(req.body)] as any[];
    
    if (!fields.includes('id')) {
        const sql = `INSERT INTO ${table} (id, ${columns}) VALUES (?, ${placeholders})`;
        args.unshift(id);
        await turso.execute(sql, args);
    } else {
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        await turso.execute(sql, args);
    }

    res.json({ id, ...req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:table/:id", validateTable, async (req, res) => {
  const { table, id } = req.params;
  const fields = sanitizeFields(Object.keys(req.body).filter(k => k !== 'id'));
  const setClause = fields.map(f => `${f} = ?`).join(", ");
  const args = [...fields.map(f => req.body[f]), id] as any[];
  
  try {
    await turso.execute(
      `UPDATE ${table} SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      args,
    );
    res.json({ id, ...req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Special routes for events (legacy compatibility)
router.post("/events_update/:id", async (req, res) => {
  const { id } = req.params;
  const fields = sanitizeFields(Object.keys(req.body).filter(k => k !== 'id'));
  const setClause = fields.map(f => `${f} = ?`).join(", ");
  const args = [...fields.map(f => req.body[f]), id] as any[];
  
  try {
    await turso.execute(
      `UPDATE events SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      args,
    );
    res.json({ id, ...req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/events_delete/:id", async (req, res) => {
  try {
    await turso.execute("DELETE FROM events WHERE id = ?", [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/events_bulk_update", async (req, res) => {
  const { ids, data } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Lista de IDs inválida" });
  }

  const fields = sanitizeFields(Object.keys(data).filter(k => k !== 'id'));
  const setClause = fields.map(f => `${f} = ?`).join(", ");
  
  try {
    for (const id of ids) {
      const args = [...fields.map(f => data[f]), id];
      await turso.execute(
        `UPDATE events SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        args,
      );
    }
    res.json({ success: true, count: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE route for specific tables
router.delete("/:table/:id", validateTable, async (req, res) => {
  const { table, id } = req.params;

  // Only ADMIN can delete users or activity_logs
  if (table === 'users' || table === 'activity_logs') {
    const user = await turso.execute("SELECT role FROM users WHERE id = ?", [req.session!.userId]);
    const role = (user.rows[0] as any)?.role;
    if (role !== 'ADMIN') {
      return res.status(403).json({ error: "Apenas administradores podem remover registros desta tabela" });
    }
  }

  try {
    await turso.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
