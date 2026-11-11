import { createServer } from "node:http";
import { dates, statistics } from "../shared/statistics";

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/health") {
    res.end('{"ok":true}');
    return;
  }
  if (
    !["GET", "POST"].includes(req.method ?? "") ||
    url.pathname !== "/statistics"
  ) {
    res.writeHead(404).end("{}");
    return;
  }
  try {
    let parameters: Record<string, unknown>;
    if (req.method === "POST") {
      let body = "";
      for await (const chunk of req) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 8192) {
          res.writeHead(413).end('{"message":"Request too large"}');
          return;
        }
      }
      parameters = JSON.parse(body);
    } else parameters = Object.fromEntries(url.searchParams);
    if (!parameters || typeof parameters !== "object") throw new Error();
    const { branchExternalId, dateFrom, dateTo } = parameters;
    if (
      typeof branchExternalId !== "string" ||
      typeof dateFrom !== "string" ||
      typeof dateTo !== "string"
    )
      throw new Error();
    if (!["ext-1", "ext-2", "ext-3", "ext-4"].includes(branchExternalId)) {
      res.writeHead(404).end('{"message":"Unknown branch"}');
      return;
    }
    const items = dates(dateFrom, dateTo).map((date) =>
      statistics(branchExternalId, date),
    );
    res.end(JSON.stringify({ branchExternalId, items }));
  } catch {
    res.writeHead(400).end('{"message":"Invalid request or period"}');
  }
}).listen(4001, "0.0.0.0");
