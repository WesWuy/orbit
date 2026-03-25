const { execFileSync } = require("child_process");
const path = require("path");
process.chdir(__dirname);
execFileSync(
  path.join(__dirname, "node_modules", ".bin", "vite.cmd"),
  process.argv.slice(2),
  { stdio: "inherit", shell: true }
);
