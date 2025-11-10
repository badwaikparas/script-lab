import React, { createContext, useContext, useEffect, useRef, useState } from "react";

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
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

    const send = (msg) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
        }
    };

    return (
        <WebSocketContext.Provider
            value={{
                current: wsRef.current, // ✅ behave like ref
                wsRef,                  // ✅ expose actual ref
                isConnected,
                send,
            }}
        >
            {children}
        </WebSocketContext.Provider>
    );
};
