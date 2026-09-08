// Tiny static file server for the local fixture site, used to exercise the crawler and
// batch CLI against a company site that isn't the real open internet (per Section 9's
// note that batch-test company sites "may be served from a local address").
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "local-site");
const PORT = Number(process.env.FIXTURE_PORT ?? 8099);

const ROUTES = {
  "/": "index.html",
  "/careers": "careers.html",
  "/about": "about.html",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const file = ROUTES[url.pathname];
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
    return;
  }
  try {
    const body = await readFile(path.join(ROOT, file));
    res.writeHead(200, { "content-type": "text/html" });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(PORT, () => {
  console.log(`Fixture site listening on http://localhost:${PORT}`);
});
