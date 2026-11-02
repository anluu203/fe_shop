import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const target = fileURLToPath(new URL("../.env", import.meta.url));
let source;
try { source = await readFile(target, "utf8"); }
catch { source = await readFile(new URL("../.env.example", import.meta.url), "utf8"); }
const values = parseEnv(source);
function set(key, value) {
  const expression = new RegExp(`^${key}=.*$`, "m");
  source = expression.test(source) ? source.replace(expression, `${key}=${value}`) : `${source.trimEnd()}\n${key}=${value}\n`;
}
if (!values.AUTH_SECRET || Buffer.byteLength(values.AUTH_SECRET) < 32) set("AUTH_SECRET", randomBytes(48).toString("hex"));
set("NEXT_PUBLIC_USE_MOCK", "false");
set("NEXT_PUBLIC_API_URL", "/api/v1");
if (!values.RETURN_WINDOW_DAYS) set("RETURN_WINDOW_DAYS", "14");
await writeFile(target, source, { encoding: "utf8", mode: 0o600 });
console.log("Configured local backend: /api/v1, database mode, persistent signing secret. Existing database credentials were preserved.");
