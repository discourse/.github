/* eslint-disable no-console */
/* eslint-disable no-restricted-globals */
import * as fs from "node:fs/promises";
import { argv, env, exit } from "node:process";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import glob from "glob";
import { parse } from "yaml";
import { Octokit } from "@octokit/core";
import { throttling } from "@octokit/plugin-throttling";

const TITLE = "DEV: Update CI workflows";
const BRANCH = "update-ci";
const PR_BODY = "Updates CI from discourse/.github";

function run(command, ...args) {
  console.log(`> ${command} ${args.join(" ")}`);
  const { error, output } = spawnSync(command, args, { cwd: "./repo" });

  if (error) {
    console.error(error, output);
  }
}

const ThrottledOctokit = Octokit.plugin(throttling);

const octokit = new ThrottledOctokit({
  auth: env["GITHUB_TOKEN"],
  throttle: {
    minimumSecondaryRateRetryAfter: 30,

    onRateLimit: (retryAfter, options) => {
      if (options.request.retryCount < 10) {
        octokit.log.warn(
          `Request quota exhausted for request ${options.method} ${options.url}`,
          `Retrying after ${retryAfter} seconds!`
        );
        return true;
      }
    },

    onSecondaryRateLimit: (retryAfter, options) => {
      if (options.request.retryCount < 10) {
        octokit.log.warn(
          `Secondary rate limit hit for ${options.method} ${options.url}`,
          `Retrying after ${retryAfter} seconds!`
        );
        return true;
      }
    },
  },
});

// Workaround for @octokit/plugin-throttling bug
// See: https://github.com/octokit/plugin-throttling.js/pull/462
octokit.hook.after("request", async (response, options) => {
  if (options.request.retryCount) {
    options.request.retryCount = 0;
  }
});

if (argv[2] !== "plugins" && argv[2] !== "themes") {
  console.log("Usage: node update-workflows.js [plugins|themes]");
  exit(1);
}

const type = argv[2];
const { repositories } = parse(await fs.readFile(`./${type}.yml`, "utf8"));
const workflows = glob.sync(
  `./${type === "themes" ? "theme-" : ""}workflow-templates/*.yml`
);

for (const repository of repositories) {
  await fs.rm("./repo", { recursive: true, force: true });

  execSync(
    `git clone https://github.com/discourse/${repository} -q --depth 1 repo`
  );

  await fs.mkdir("./repo/.github/workflows", { recursive: true });
  await Promise.all(
    workflows.map((workflowPath) => {
      const filename = path.basename(workflowPath);
      return fs.cp(workflowPath, `./repo/.github/workflows/${filename}`);
    })
  );

  const anyChanges =
    execSync("git -C repo status --porcelain", {
      encoding: "utf8",
    }).trim() !== "";

  if (!anyChanges) {
    console.log(`✅ '${repository}' is already up to date`);
    continue;
  }

  console.log(`Updating '${repository}'`);

  run("git", "checkout", "-b", BRANCH);
  run("git", "add", ".github/workflows/*");
  run("git", "commit", "-m", TITLE);
  run("git", "push", "-f", "--set-upstream", "origin", BRANCH);

  try {
    await octokit.request("POST /repos/{owner}/{repo}/pulls", {
      owner: "discourse",
      repo: repository,
      title: TITLE,
      head: BRANCH,
      base: "main",
      body: PR_BODY,
    });
    console.log(`✅ PR created for '${repository}'`);
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.message;

    if (message && /A pull request already exists/.test(message)) {
      console.log(`✅ PR already exists for '${repository}'`);
    } else {
      console.error(`❓ Failed to create PR for '${repository}'`);
      console.error(error);
      break;
    }
  }
}

await fs.rm("./repo", { recursive: true, force: true });
