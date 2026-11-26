import { build, preview } from "vite";
import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { promisify } from "node:util";
const run = promisify(execFile);
const directory = "audit-reports";
const cli = fileURLToPath(
  new URL("../node_modules/lighthouse/cli/index.js", import.meta.url),
);
await mkdir(directory, { recursive: true });
await build();
const server = await preview({ preview: { host: "127.0.0.1", port: 0 } });
try {
  const port = server.httpServer.address().port;
  for (const route of ["diagnosis", "shelf", "width", "catalog"]) {
    for (const device of ["desktop", "mobile"]) {
      const stem = directory + "/" + route + "-" + device;
      const url = "http://127.0.0.1:" + port + "/#" + route;
      const args = [
        cli,
        url,
        "--quiet",
        "--chrome-flags=--headless",
        "--only-categories=accessibility,best-practices",
        "--output=html",
        "--output=json",
        "--output-path=" + stem,
      ];
      if (device === "desktop") args.push("--preset=desktop");
      await run(process.execPath, args);
      const result = JSON.parse(await readFile(stem + ".report.json", "utf8"));
      console.log(
        route,
        device,
        Object.fromEntries(
          Object.entries(result.categories).map(([key, value]) => [
            key,
            Math.round(value.score * 100),
          ]),
        ),
      );
    }
  }
} finally {
  await server.close();
}
