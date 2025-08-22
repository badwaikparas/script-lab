import React from "react";
import WebTerminal from "./WebTerminal";
import Navbar from "./components/Navbar";

function App() {
    return (
        <div className="h-screen w-screen flex flex-col"> {/* full height column layout */}
            <Navbar />
            <div className="flex-1"> {/* take remaining space */}
                <WebTerminal />
            </div>
        </div>
    );
}

export default App;
