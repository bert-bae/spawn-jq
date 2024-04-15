import express, { Express, Request, Response } from "express";
// import { run } from "./utils/exec";
import bodyParser from "body-parser";
import util from "node:util";
import { jq } from "./jq";

// const exec = util.promisify(require("node:child_process").exec);

const app: Express = express();
app.use(bodyParser.json());
const port = 9000;

type JqBody = { json: Record<string, unknown>; jq: string };

app.post("/jq", async (req: Request<{}, {}, JqBody>, res: Response) => {
  const { jq: query, json } = req.body;
  jq(query, json, { slurp: false, sort: true, raw: false }, { output: "json" })
    .then((result) => {
      res.send(result);
    })
    .catch((error) => {
      res.status(500).send({
        message: error.message,
      });
    });
});

app.listen(port, () => {
  console.log(`running at https://localhost:${port}`);
});
