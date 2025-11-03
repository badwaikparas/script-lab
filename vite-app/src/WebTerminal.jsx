import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";

const WS_URL = "ws://localhost:3000/terminal"; // adjust if needed

function formatNumber(n) {
    return typeof n === "number" ? n.toFixed(3) : n;
}

const WebTerminal = () => {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);
    const ws = useRef(null);

    const [hostLimits, setHostLimits] = useState(null);
    const [cpu, setCpu] = useState("");
    const [ramValue, setRamValue] = useState("");
    const [ramUnit, setRamUnit] = useState("gb"); // "gb" | "mb"
    const [status, setStatus] = useState("");

    useEffect(() => {
        term.current = new Terminal({ convertEol: true, cursorBlink: true });
        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);

        if (terminalRef.current) {
            term.current.open(terminalRef.current);
            fitAddon.current.fit();
        }

        ws.current = new WebSocket(WS_URL);

        const handleBeforeUnload = () => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: "commands", data: ["exit"] }));
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        ws.current.addEventListener("open", () => {
            setStatus("connected");
            // request fresh host limits
            ws.current.send(JSON.stringify({ type: "request_host_limits" }));
            const { cols, rows } = term.current;
            ws.current.send(JSON.stringify({ type: "resize", data: { cols, rows } }));
            term.current.focus();
        });

        ws.current.addEventListener("message", (ev) => {
            const msg = JSON.parse(ev.data);

            if (msg.type === "host_limits") {
                setHostLimits(msg.data);
                return;
            }
            if (msg.type === "data") {
                term.current.write(msg.data);
                return;
            }
            if (msg.type === "started") {
                setStatus("container started");
                term.current.writeln(`\r\n${msg.message}\r\n`);
                return;
            }
            if (msg.type === "exit") {
                term.current.writeln(`\r\n\n[process exited: code=${msg.exitCode}]`);
                setStatus("container exited");
                return;
            }
            if (msg.type === "error") {
                term.current.writeln(`\r\n[ERROR] ${msg.message}\r\n`);
                setStatus("error");
                return;
            }
        });

        term.current.onData((data) => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: "input", data }));
            }
        });

        const handleResize = () => {
            if (term.current && !term.current._disposed) {
                fitAddon.current.fit();
                ws.current?.send(
                    JSON.stringify({
                        type: "resize",
                        data: { cols: term.current.cols, rows: term.current.rows }
                    })
                );
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            term.current?.dispose();
            ws.current?.close();
        };
    }, []);

    const formatRamToCompareGB = () => {
        const val = Number(ramValue);
        if (!Number.isFinite(val) || val <= 0) return 0;
        return ramUnit === "mb" ? val / 1024 : val;
    };

    const validateAndStart = () => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            alert("WebSocket not connected");
            return;
        }

        // parse inputs
        const cpuNum = Number(cpu);
        const ramGB = formatRamToCompareGB();

        if (!Number.isFinite(cpuNum) || cpuNum <= 0) {
            alert("Enter a valid CPU value (e.g., 0.5 or 1)");
            return;
        }
        if (!Number.isFinite(ramGB) || ramGB <= 0) {
            alert("Enter a valid RAM value (> 0)");
            return;
        }

        if (!hostLimits) {
            alert("Host limits not loaded yet. Try again in a second.");
            return;
        }

        // Client-side safety checks (mirror server policy)
        if (ramGB > hostLimits.safeRamGB) {
            alert(`Requested RAM (${ramGB.toFixed(3)} GB) exceeds safe limit (${hostLimits.safeRamGB} GB).`);
            return;
        }

        if (cpuNum > Math.max(hostLimits.safeCpu, 0.1)) {
            alert(`Requested CPU (${cpuNum}) exceeds safe CPU available (${hostLimits.safeCpu}).`);
            return;
        }

        console.log(Number(ramValue) + " " + ramUnit)

        // send start request along with terminal size
        ws.current.send(
            JSON.stringify({
                type: "start_container",
                data: {
                    cpu: cpuNum,
                    ramGB: ramGB,               
                    ramUnit: ramUnit,           
                    cols: term.current.cols,
                    rows: term.current.rows
                }
            })
        );

        setStatus("starting container...");
    };

    return (
        <div className="flex flex-col h-full w-full p-4">
            <div className="flex gap-3 items-end mb-3">
                <div>
                    <label className="block text-sm">CPU (cores)</label>
                    <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={cpu}
                        onChange={(e) => setCpu(e.target.value)}
                        placeholder="e.g., 0.5"
                        className="border p-2 rounded w-36"
                    />
                </div>

                <div>
                    <label className="block text-sm">RAM</label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="number"
                            step="0.1"
                            min="1"
                            value={ramValue}
                            onChange={(e) => setRamValue(e.target.value)}
                            placeholder="e.g., 1 or 512"
                            className="border p-2 rounded w-28"
                        />
                        <select
                            value={ramUnit}
                            onChange={(e) => setRamUnit(e.target.value)}
                            className="border p-2 rounded"
                        >
                            <option value="gb">GB</option>
                            <option value="mb">MB</option>
                        </select>
                    </div>
                </div>

                <div>
                    <button
                        onClick={validateAndStart}
                        className="bg-blue-500 text-white px-4 py-2 rounded shadow"
                    >
                        Start Docker (safe)
                    </button>
                </div>

                <div className="ml-4">
                    <div className="text-sm">Status: <strong>{status}</strong></div>
                </div>
            </div>

            <div className="mb-3 text-sm">
                <div><strong>Host limits (server):</strong></div>
                {hostLimits ? (
                    <div>
                        <div>Total RAM: {formatNumber(hostLimits.totalRamGB)} GB</div>
                        <div>Free RAM: {formatNumber(hostLimits.freeRamGB)} GB</div>
                        <div>Safe RAM (80% of free): {formatNumber(hostLimits.safeRamGB)} GB</div>
                        <div>Total cores: {hostLimits.totalCores}</div>
                        <div>Load(1m): {hostLimits.load1}</div>
                        <div>Safe CPU (heuristic): {formatNumber(hostLimits.safeCpu)}</div>
                    </div>
                ) : (
                    <div>Loading host limits…</div>
                )}
            </div>

            <div className="p-3 bg-black rounded flex-1 min-h-[300px]">
                <div ref={terminalRef} className="flex-1 w-full h-full rounded overflow-hidden" />
            </div>
        </div>
    );
};

export default React.memo(WebTerminal);
