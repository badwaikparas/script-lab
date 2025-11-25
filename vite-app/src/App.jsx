import WebTerminal from "./WebTerminal";
import Navbar from "./components/Navbar";
import ExcalidrawContainer from "./ExcalidrawContainer";
import { WebSocketProvider } from "./utils/WebSocketContext";
import { useRef } from "react";
// import { useEffect, useRef } from "react";

function App() {
    // const ws = useRef(null)

    // useEffect(() => {
    //     ws.current = new WebSocket(`ws://localhost:3000/terminal`);
    // }, [])

    const sharedWs = useRef(null);

    return (
        // <WebSocketProvider>
        <div className="h-screen w-screen flex flex-col"> {/* full height column layout */}
            <Navbar />
            <div className="flex-1">
                <WebTerminal sharedWs={sharedWs} />
                <ExcalidrawContainer sharedWs={sharedWs} />
            </div>
        </div>
        // </WebSocketProvider>
    );
}

export default App;
