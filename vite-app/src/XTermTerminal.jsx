import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";

const XTermTerminal = () => {
    const terminalRef = useRef(null);

    useEffect(() => {
        if (terminalRef.current) {
            const xterm = new Terminal({
                cursorBlink: true,
            });

            xterm.open(terminalRef.current);
            xterm.writeln("Welcome to xterm.js!\r\nType something...");

            // Listen for input
            xterm.onData((data) => {
                if (data.charCodeAt(0) === 13) {
                    // ENTER key → move to new line
                    xterm.writeln("");
                } else {
                    // Echo typed character
                    xterm.write(data);
                }
            });

            return () => xterm.dispose();
        }
    }, []);

    return (
        <div
            ref={terminalRef}
            style={{ width: "100%", height: "400px", background: "#1e1e1e" }}
        />
    );
};

export default React.memo(XTermTerminal);
