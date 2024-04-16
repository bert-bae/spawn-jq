const { spawn } = require("child_process");

// 5MB - Set this limit as another measure to limit the amount of data we can process using `jq` so we don't have runaway processes.
const MAX_BUFFER = 1024 * 1024 * 5;

interface ProcessOptions {
  cwd?: string;
  detached?: boolean;
  output: "raw" | "json";
  timeout?: number;
}

type JqOptions = {
  raw?: boolean;
  slurp?: boolean;
  sort?: boolean;
};

const createJqOptionFlags = (opts: JqOptions) => {
  const flags: string[] = [];
  if (opts.slurp) {
    flags.push("-s");
  }
  if (opts.sort) {
    flags.push("-S");
  }
  if (opts.raw) {
    flags.push("-r");
  }

  return flags;
};

const tryParse = (json: string) => {
  try {
    return JSON.parse(json);
  } catch (err) {
    throw new Error(`Failed to parse string into json. ${err.message}`);
  }
};

const exitCodes = {
  2: "Parsing error reading input",
  3: "Syntax error",
  4: "Syntax error",
  5: "Unknown error. Process exited",
};

export function jq(query, jsonData, jqOpts: JqOptions, opts: ProcessOptions) {
  return new Promise((resolve, reject) => {
    const spawnOptions = {
      maxBuffer: MAX_BUFFER,
      cwd: opts.cwd,
      detached: opts.detached,
    };
    console.log([...createJqOptionFlags(jqOpts), query].join(" "));
    const jqProcess = spawn(
      "jq",
      [...createJqOptionFlags(jqOpts), query],
      spawnOptions
    );
    const spawnTimeout = setTimeout(() => {
      jqProcess.kill();
      console.log("timed out");
    }, opts.timeout);

    let stderr = "";
    let output = "";

    // Handling output
    jqProcess.stdout.setDefaultEncoding("utf-8");
    jqProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    // Handling errors
    jqProcess.stderr.on("data", (data) => {
      stderr += data;
    });

    // Handling process completion
    jqProcess.on("close", (code) => {
      if (code !== 0) {
        reject(
          `jq process exited with code ${code}. ${
            exitCodes[code] || "Unhandled error"
          }`
        );
      } else {
        console.log(">>", output);
        try {
          resolve(opts.output === "json" ? tryParse(output) : output);
        } catch (err) {
          reject(err);
        }
      }
      clearTimeout(spawnTimeout);
    });

    // Sending JSON data to jq process
    jqProcess.stdin.setDefaultEncoding("utf-8");
    jqProcess.stdin.write(JSON.stringify(jsonData));
    jqProcess.stdin.end();
  });
}
