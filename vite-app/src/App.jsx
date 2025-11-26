import WebTerminal from "./WebTerminal";
import Navbar from "./components/Navbar";
import ExcalidrawContainer from "./ExcalidrawContainer";
import { WebSocketProvider } from "./utils/WebSocketContext";
import { useRef, useState } from "react";

import TabsHeader from "./components/TabsHeader";

function App() {
    // const ws = useRef(null)

    // useEffect(() => {
    //     ws.current = new WebSocket(`ws://localhost:3000/terminal`);
    // }, [])

    // const sharedWs = useRef(null);



    const sharedWs = useRef(null);
    const [tabs, setTabs] = useState([
        { id: 1, title: "Terminal 1" },
    ]);
    const [activeTab, setActiveTab] = useState(0);

    return (
        // <WebSocketProvider>
        <div className="h-screen w-screen flex flex-col"> {/* full height column layout */}
            {/* <Navbar />
            <div className="flex-1">
                <WebTerminal sharedWs={sharedWs} />
                <ExcalidrawContainer sharedWs={sharedWs} />
            </div> */}

            <Navbar />

            <TabsHeader
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setTabs={setTabs}
            />

            <div className="flex-1">
                {tabs.map((tab, index) => (
                    index === activeTab && (
                        <WebTerminal
                            key={tab.id}
                            tabId={tab.id}
                            sharedWs={sharedWs}
                            isActive={index === activeTab}
                        />
                    )
                ))}
                <ExcalidrawContainer sharedWs={sharedWs} />
            </div>


        </div>
        // </WebSocketProvider>
    );
}

export default App;
