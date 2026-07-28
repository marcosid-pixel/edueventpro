import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config({ path: "C:/Users/1-03586/Desktop/eduevent-pro/.env" });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:C:/Users/1-03586/Desktop/eduevent-pro/local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
async function main() {
  // Evento de teste: ontem as 10:00 - 11:00, status Scheduled
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];
  
  const id = "events_test_" + Date.now();
  const event = {
    id,
    title: "Aula Teste Confirmação",
    type: "Aula síncrona",
    course: "Ed. Física (Bacharelado)",
    teacher: "joão marcos mesquita morais",
    date: dateStr,
    time: "10:00 - 11:00",
    timeStart: "10:00",
    timeEnd: "11:00",
    status: "Scheduled",
    location: "Sala 101",
    description: "Evento de teste para verificar botão de confirmação",
    createdBy: "user_1778687235171"
  };
  
  const cols = Object.keys(event);
  const placeholders = cols.map(() => "?").join(", ");
  const values = cols.map(k => event[k]);
  
  await turso.execute(
    "INSERT INTO events (" + cols.join(", ") + ") VALUES (" + placeholders + ")",
    values
  );
  console.log("Evento criado: " + JSON.stringify(event));
  
  // Verificar
  const check = await turso.execute("SELECT id, title, date, time, status FROM events WHERE id = ?", [id]);
  console.log("Verificação:", JSON.stringify(check.rows[0]));
}
main().catch(console.error);
