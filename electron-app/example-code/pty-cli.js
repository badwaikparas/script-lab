// file: pty-cli.js (CommonJS)
const os = require('os');
const readline = require('readline');
const pty = require('node-pty');

const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash';

const p = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
    cwd: process.cwd(),
    env: process.env,
});

console.log(`[node-pty] spawned pid=${p.pid} shell=${shell}`);

p.onData(data => {
    process.stdout.write(data);
});

p.onExit(({ exitCode, signal }) => {
    console.log(`\n[node-pty] exit code=${exitCode} signal=${signal ?? 'null'}`);
    process.exit(exitCode ?? 0);
});

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

// forward user keystrokes to the PTY
process.stdin.on('data', chunk => {
    p.write(chunk.toString('utf8'));
});

// resize PTY when terminal resizes
process.stdout.on('resize', () => {
    p.resize(process.stdout.columns, process.stdout.rows);
});

// graceful shutdown on Ctrl+C / termination
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sig, () => {
        try { p.kill(); } catch { }
        process.exit(0);
    });
}
