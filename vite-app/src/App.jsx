import WebTerminal from "./WebTerminal";
import Navbar from "./components/Navbar";
import ExcalidrawContainer from "./ExcalidrawContainer";
import { WebSocketProvider } from "./utils/WebSocketContext";
import { useEffect, useRef } from "react";

function App() {
    const ws = useRef(null)

    useEffect(() => {
        ws.current = new WebSocket(`ws://localhost:3000/terminal`);
    }, [])

    return (
        <WebSocketProvider>
            <div className="h-screen w-screen flex flex-col"> {/* full height column layout */}
                <Navbar />
                <div className="flex-1"> {/* take remaining space */}
                    <WebTerminal />
                    <ExcalidrawContainer />
                </div>
            </div>
        </WebSocketProvider>
    );
}

export default App;
