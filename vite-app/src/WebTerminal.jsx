import React, { useEffect, useRef } from "react";
import { useWebSocket } from "./utils/WebSocketContext";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";

const WebTerminal = () => {
    // const ws = useRef(null)
    const ws = useWebSocket();
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);

    useEffect(() => {
        if (!ws.current) return;   // ✅ now effect only runs when ws becomes available

        term.current = new Terminal({
            convertEol: true,
            cursorBlink: true,
        });

        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);

        if (terminalRef.current) {
            term.current.open(terminalRef.current);
            fitAddon.current.fit();
        }

        const handleBeforeUnload = () => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                    type: "commands",
                    data: ["exit"],
                }));
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        ws.current.addEventListener("open", () => {
            const { cols, rows } = term.current;
            ws.current.send(JSON.stringify({
                type: "resize",
                data: { cols, rows },
            }));
            term.current.focus();
        });

        ws.current.addEventListener("message", (ev) => {
            const msg = JSON.parse(ev.data);

            if (msg.type === "data") term.current.write(msg.data);
            if (msg.type === "exit") {
                term.current.writeln(
                    `\r\n\n[process exited: code=${msg.exitCode}, signal=${msg.signal}]`
                );
            }
        });

        term.current.onData((data) => {
            ws.current.send(JSON.stringify({
                type: "input",
                data,
            }));
        });

        const handleResize = () => {
            if (term.current && !term.current._disposed) {
                fitAddon.current.fit();
                ws.current?.send(JSON.stringify({
                    type: "resize",
                    data: {
                        cols: term.current.cols,
                        rows: term.current.rows,
                    },
                }));
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            term.current?.dispose();
            ws.current?.close();
        };
    }, [ws.current]);   // ✅ THIS LINE FIXES YOUR PROBLEM


    const onButtonPress = () => {
        const commands = [
            "docker run --rm -it ubuntu:latest bash",
            "clear",
        ];

        ws.current.send(
            JSON.stringify({
                type: "commands",
                data: commands,
            })
        );
    };

    return (
        <div className="flex flex-col h-screen w-full p-4">
            <button
                onClick={onButtonPress}
                className="bg-blue-500 text-white px-4 py-2 rounded shadow mb-2 self-start"
            >
                Start Docker Container
            </button>

            <button
                onClick={onButtonPress}
                className="bg-white text-blue-500 px-4 py-2 rounded shadow mb-2 self-start border-2 border-dashed border-blue-500"
            >
                Add Button
            </button>

            <div className="p-3 bg-black rounded flex-1">
                <div
                    ref={terminalRef}
                    className="w-full h-full rounded overflow-hidden"
                ></div>
            </div>
        </div>
    );
};

export default React.memo(WebTerminal);
