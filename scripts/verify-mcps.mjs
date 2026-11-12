#!/usr/bin/env node
/**
 * Live check of the bundled MCP servers: `pnpm verify:mcps`.
 *
 * Reads the generated `plugin/.mcp.json`, starts or calls every server with no
 * credentials, sends an MCP `initialize` and a `tools/list`, and prints one line per
 * server. It exits non-zero if any server fails to answer.
 *
 * This needs the network and downloads the stdio packages through `npx`, so it is not
 * part of `pnpm check` or CI. Run it before a release and when a server looks broken.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TIMEOUT_MS = 120_000;

const INIT = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "godmode-verify", version: "1.0.0" },
  },
};
const INITIALIZED = { jsonrpc: "2.0", method: "notifications/initialized" };
const LIST = { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };

/** Pull JSON-RPC messages out of a plain JSON body or a server-sent event stream. */
export function parseMessages(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const raw = line.startsWith("data:") ? line.slice(5).trim() : line.trim();
    if (!raw.startsWith("{")) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      // Not a complete JSON object on this line; ignore it.
    }
  }
  return out;
}

async function post(url, body, sessionId) {
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { res, text: await res.text() };
}

async function checkHttp(url) {
  const init = await post(url, INIT);
  if (init.res.status === 401 || init.res.status === 403) {
    throw new Error(`HTTP ${init.res.status}: the endpoint now requires authentication`);
  }
  if (!init.res.ok) throw new Error(`HTTP ${init.res.status} on initialize`);
  const hello = parseMessages(init.text).find((m) => m.id === 1);
  if (!hello?.result) throw new Error("no initialize result");
  const session = init.res.headers.get("mcp-session-id");
  await post(url, INITIALIZED, session);
  const list = await post(url, LIST, session);
  const tools = parseMessages(list.text).find((m) => m.id === 2)?.result?.tools;
  if (!Array.isArray(tools)) throw new Error(`no tools/list result (HTTP ${list.res.status})`);
  return { server: hello.result.serverInfo, tools: tools.length };
}

function checkStdio(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let buffer = "";
    let stderr = "";
    let server;
    const finish = (fn, value) => {
      clearTimeout(timer);
      child.kill("SIGTERM");
      fn(value);
    };
    const timer = setTimeout(
      () => finish(reject, new Error(`timed out; stderr: ${stderr.slice(-200)}`)),
      TIMEOUT_MS,
    );
    const send = (message) => child.stdin.write(JSON.stringify(message) + "\n");
    child.on("error", (e) => finish(reject, e));
    child.stderr.on("data", (d) => (stderr += d));
    child.stdout.on("data", (d) => {
      buffer += d;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const message of parseMessages(lines.join("\n"))) {
        if (message.id === 1 && message.result) {
          server = message.result.serverInfo;
          send(INITIALIZED);
          send(LIST);
        } else if (message.id === 2) {
          const tools = message.result?.tools;
          if (Array.isArray(tools)) finish(resolve, { server, tools: tools.length });
          else finish(reject, new Error("no tools/list result"));
        }
      }
    });
    send(INIT);
  });
}

async function main() {
  const config = JSON.parse(readFileSync(join(ROOT, "plugin", ".mcp.json"), "utf8"));
  let failed = 0;
  for (const [name, def] of Object.entries(config.mcpServers)) {
    const target = def.type === "http" ? def.url : [def.command, ...def.args].join(" ");
    try {
      const r =
        def.type === "http" ? await checkHttp(def.url) : await checkStdio(def.command, def.args);
      const version = r.server?.version ? ` ${r.server.version}` : "";
      console.log(
        `ok    ${name.padEnd(16)} ${String(r.tools).padStart(3)} tools  ${target}${version}`,
      );
    } catch (e) {
      failed++;
      console.log(`FAIL  ${name.padEnd(16)} ${target}\n      ${e.message}`);
    }
  }
  console.log(
    failed ? `\n${failed} server(s) failed` : "\nall servers answered without credentials",
  );
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
