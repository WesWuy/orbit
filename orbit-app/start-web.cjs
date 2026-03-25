const { spawn } = require('child_process')
const path = require('path')

process.chdir(__dirname)

const port = process.argv.find((a, i) => process.argv[i - 1] === '--port') || '3001'

const child = spawn('npx.cmd', ['expo', 'start', '--web', '--port', port, '--non-interactive'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, BROWSER: 'none' },
})

child.on('exit', (code) => process.exit(code ?? 0))
