import { useEffect, useRef, useState } from "react";

export default function useTerminalWS() {
    const wsRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:3000/terminal");
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("✅ WebSocket Connected");
            setIsConnected(true);
        };

        ws.onclose = () => {
            console.log("❌ WebSocket Closed");
            setIsConnected(false);
        };

        ws.onerror = (err) => {
            console.error("⚠️ WebSocket Error:", err);
        };

        return () => {
            console.log("🔌 Closing WebSocket...");
            ws.close();
        };
    }, []);

    // ⭐ ADD SEND FUNCTION HERE
    const send = (msg) => {
        if (
            wsRef.current &&
            wsRef.current.readyState === WebSocket.OPEN
        ) {
            wsRef.current.send(JSON.stringify(msg));
        } else {
            console.warn("⚠️ Cannot send message, WebSocket not open");
        }
    };

    return {
        wsRef,
        isConnected,
        send,          // ⭐ RETURN SEND
    };
}
