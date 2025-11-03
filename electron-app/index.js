// file: server.js
const os = require('os');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/terminal' });

// serve static frontend files
app.use(express.static('public'));


// ✅ ADDED — function to get host limits safely
function getHostLimits() {
    const totalMemGB = os.totalmem() / 1024 / 1024 / 1024;
    const freeMemGB = os.freemem() / 1024 / 1024 / 1024;

    const safeRamGB = freeMemGB * 0.8; // leave buffer for OS

    const cores = os.cpus().length;
    const load1 = os.loadavg()[0];
    const safeCpu = Math.max(0.1, (cores - load1) - 0.5);

    return {
        totalRamGB: Number(totalMemGB.toFixed(3)),
        freeRamGB: Number(freeMemGB.toFixed(3)),
        safeRamGB: Number(safeRamGB.toFixed(3)),
        totalCores: cores,
        load1: Number(load1.toFixed(3)),
        safeCpu: Number(safeCpu.toFixed(3)),
    };
}

// ✅ ADDED — convert user RAM/GPU inputs into docker-input format
function formatRamToDocker(valGB) {
    console.log("valGB : " + valGB)
    if (valGB < 1) {
        return `${Math.round(valGB * 1024)}m`; // convert to MB
    }
    return `${valGB}g`;
}

wss.on('connection', (ws, req) => {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash';

    // ✅ NEW: send host limits on connect
    ws.send(JSON.stringify({ type: "host_limits", data: getHostLimits() }));

    const p = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: process.env,
    });

    console.log(`[PTY] client connected, pid=${p.pid}`);

    // PTY → Browser
    p.onData(data => {
        if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: 'data', data }));
    });

    p.onExit(({ exitCode, signal }) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'exit', exitCode, signal }));
            ws.close();
        }
        console.log(`[PTY] exited pid=${p.pid} code=${exitCode} signal=${signal ?? 'null'}`);
    });

    // existing command-sequencer unchanged
    function runCommands(commands) {
        let index = 0;

        const sendNext = () => {
            if (index < commands.length) {
                const cmd = commands[index];
                console.log(`>>> Running: ${cmd}`);
                p.write(cmd + "\r");
                index++;
            }
        };

        p.onData(data => {
            if ((data.includes('$ ') || data.includes('# ') || data.includes('> ')) &&
                !data.includes('>>')) {
                sendNext();
            }
        });

        sendNext();
    }


    // ✅ ADDED — function to start Docker with safe resource limits
    function startDockerContainer(cpu, ramGB) {
        const memArg = formatRamToDocker(ramGB);

        const dockerCmd =
            `docker run --rm -it --cpus="${cpu}" --memory="${memArg}" ubuntu:latest bash`;

        console.log("[SAFE DOCKER RUN]:", dockerCmd);

        p.write(dockerCmd + "\r");
    }


    // Browser → PTY
    ws.on('message', msg => {
        try {
            const { type, data } = JSON.parse(msg);

            if (type === 'input') p.write(data);

            if (type === 'resize' && data?.cols && data?.rows) {
                p.resize(Math.max(1, data.cols), Math.max(1, data.rows));
            }

            if (type === 'commands' && Array.isArray(data)) {
                runCommands(data);
            }

            // ✅ NEW — handle container start request
            if (type === "start_container") {
                const { cpu, ramGB } = data;
                const limits = getHostLimits();

                // ✅ Validate CPU
                if (cpu > limits.safeCpu) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: `Requested CPU (${cpu}) exceeds safe limit (${limits.safeCpu})`
                    }));
                    return;
                }

                // ✅ Validate RAM
                if (ramGB > limits.safeRamGB) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: `Requested RAM (${ramGB} GB) exceeds safe limit (${limits.safeRamGB} GB)`
                    }));
                    return;
                }

                // ✅ All good → start container
                startDockerContainer(cpu, ramGB);

                ws.send(JSON.stringify({
                    type: "started",
                    message: `Container started with CPU=${cpu}, RAM=${ramGB}GB`
                }));
            }

        } catch {
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
