import { spawn } from "child_process";
import express, { Express, Request, Response } from "express";
import bodyParser from "body-parser";

const app: Express = express();
app.use(bodyParser.json());
const port = 9000;

type JqBody = { json: Record<string, unknown>; jq: string };

app.post("/jq", (req: Request<{}, {}, JqBody>, res: Response) => {
  const { jq: query, json } = req.body;
  const curl = spawn(
    "curl",
    ["https://api.github.com/repos/jqlang/jq/commits?per_page=5'"],
    {
      stdio: ["inherit", "pipe", "inherit"],
    }
  );
  const jq = spawn("jq", [query], { stdio: ["pipe", "inherit", "pipe"] });

  curl.stdout.pipe(jq.stdin);

  // @ts-ignore
  jq.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
    res.send(data);
  });

  jq.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
    res.send(data);
  });

  jq.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });
});

app.listen(port, () => {
  console.log(`running at https://localhost:${port}`);
});
