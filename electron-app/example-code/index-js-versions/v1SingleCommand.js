// file: server.js
const os = require('os');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/terminal' });

// serve static frontend files (place your index.html with xterm.js in ./public)
app.use(express.static('public'));

wss.on('connection', (ws, req) => {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash';

    const p = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: process.env,
    });

    console.log(`[PTY] client connected, pid=${p.pid}`);

    // PTY -> Browser
    p.onData(data => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'data', data }));
    });



    p.onExit(({ exitCode, signal }) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'exit', exitCode, signal }));
            ws.close();
        }
        console.log(`[PTY] exited pid=${p.pid} code=${exitCode} signal=${signal ?? 'null'}`);
    });



    // Browser -> PTY
    ws.on('message', msg => {
        try {
            const { type, data } = JSON.parse(msg);
            if (type === 'input') p.write(data);
            if (type === 'resize' && data?.cols && data?.rows) {
                p.resize(Math.max(1, data.cols), Math.max(1, data.rows));
            }
        } catch {
            // allow raw passthrough for simpler clients
            p.write(msg.toString());
        }
    });

    ws.on('close', () => {
        try { p.kill(); } catch { }
        console.log(`[PTY] client disconnected, pid=${p.pid}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
    console.log('WebSocket endpoint: ws://localhost:' + PORT + '/terminal');
});
