import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDb() {
  try {
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        displayName TEXT,
        email TEXT UNIQUE,
        password TEXT,
        photoURL TEXT,
        role TEXT DEFAULT 'professor',
        courseId TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration for existing tables: check if columns exist
    const columnsToEnsure = [
      { table: 'users', column: 'password', type: 'TEXT' },
      { table: 'users', column: 'role', type: "TEXT DEFAULT 'professor'" },
      { table: 'users', column: 'courseId', type: 'TEXT' },
      { table: 'users', column: 'category', type: 'TEXT' },
      { table: 'users', column: 'resetRequested', type: 'BOOLEAN DEFAULT 0' },
      { table: 'users', column: 'resetToken', type: 'TEXT' },
      { table: 'events', column: 'category', type: 'TEXT' },
      { table: 'events', column: 'batchId', type: 'TEXT' },
      { table: 'events', column: 'cabinInfo', type: 'TEXT' },
      { table: 'events', column: 'notificar_admin', type: 'BOOLEAN DEFAULT 0' },
      { table: 'events', column: 'plataforma_meet', type: 'BOOLEAN DEFAULT 0' },
      { table: 'events', column: 'plataforma_comapos', type: 'BOOLEAN DEFAULT 0' },
      { table: 'events', column: 'convidado_externo', type: 'BOOLEAN DEFAULT 0' },
      { table: 'events', column: 'precisa_cabine', type: 'BOOLEAN DEFAULT 0' },
      { table: 'events', column: 'timeStart', type: 'TEXT' },
      { table: 'events', column: 'timeEnd', type: 'TEXT' },
      { table: 'events', column: 'speaker', type: 'TEXT' },
      { table: 'events', column: 'cancelReason', type: 'TEXT' },
      { table: 'events', column: 'operationalStatus', type: 'TEXT' },
      { table: 'notifications', column: 'isRead', type: 'INTEGER DEFAULT 0' },
      { table: 'activity_logs', column: 'userRole', type: "TEXT DEFAULT 'PROFESSOR'" },
      { table: 'activity_logs', column: 'userPhotoURL', type: 'TEXT' },
    ];

    for (const item of columnsToEnsure) {
      try {
        await turso.execute(`ALTER TABLE ${item.table} ADD COLUMN ${item.column} ${item.type}`);
        console.log(`Column '${item.column}' added to ${item.table} table`);
      } catch (e) {
        // Ignore errors if column already exists
      }
    }

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        categories TEXT, -- JSON array
        members TEXT, -- JSON array
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT,
        course TEXT,
        teacher TEXT,
        date TEXT,
        time TEXT,
        timeStart TEXT,
        timeEnd TEXT,
        speaker TEXT,
        status TEXT,
        location TEXT,
        description TEXT,
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS speakers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        title TEXT,
        phone TEXT,
        avatar TEXT,
        events TEXT, -- JSON array
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT DEFAULT 'info',
        userId TEXT,
        isRead INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT DEFAULT 'info',
        action TEXT,
        userId TEXT,
        userName TEXT,
        userRole TEXT DEFAULT 'PROFESSOR',
        userPhotoURL TEXT,
        courseName TEXT,
        eventId TEXT,
        eventTitle TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if any users exist — if ADMIN_EMAIL env is set, create first admin
    const userCount = await turso.execute("SELECT COUNT(*) as count FROM users");
    const count = Number((userCount.rows[0] as any).count);
    
    if (count === 0 && process.env.ADMIN_EMAIL) {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminName = process.env.ADMIN_NAME || 'Administrador';

      if (!adminPassword) {
        console.warn("ADMIN_EMAIL definido mas ADMIN_PASSWORD não — admin não será criado");
      } else {
        console.log("Criando administrador inicial via variáveis de ambiente...");
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await turso.execute(
          "INSERT INTO users (id, displayName, email, password, role) VALUES (?, ?, ?, ?, ?)",
          [`admin_${Date.now()}`, adminName, adminEmail, hashedPassword, 'ADMIN']
        );
      }
    } else if (count === 0) {
      console.log("Nenhum ADMIN_EMAIL definido — primeiro usuário deve se registrar manualmente.");
    }

    // Migrate any existing plain-text passwords to bcrypt (legacy migration)
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const existingAdmin = await turso.execute(
        "SELECT id, password FROM users WHERE email = ?", [process.env.ADMIN_EMAIL]
      );
      if (existingAdmin.rows.length > 0) {
        const pw = (existingAdmin.rows[0] as any).password as string;
        if (pw && !pw.startsWith("$2a$") && !pw.startsWith("$2b$")) {
          console.log("Migrando senha do admin para bcrypt...");
          const newHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
          await turso.execute("UPDATE users SET password = ? WHERE email = ?", [newHash, process.env.ADMIN_EMAIL]);
        }
      }
    }

    console.log("Database initialized and admin access verified");
  } catch (error) {
    console.error("Database init error:", error);
  }
}
