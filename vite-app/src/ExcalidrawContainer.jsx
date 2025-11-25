import { useEffect, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
// import { useWebSocket } from "./utils/WebSocketContext";
import "@excalidraw/excalidraw/index.css";

export default function ExcalidrawContainer({ sharedWs }) {
    // const ws = useRef(null)
    const [ws, setWs] = useState(null);
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);

    useEffect(() => {
        setWs(sharedWs.current)
    }, [sharedWs])

    const getData = () => {
        if (!excalidrawAPI) return;

        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        // ✅ Selected shapes
        const selectedElements = elements.filter(
            (el) => appState.selectedElementIds[el.id]
        );

        // ✅ For each selected rectangle, find text inside its bounds
        const textsInside = [];

        selectedElements.forEach((rect) => {
            if (rect.type === "rectangle") {
                elements.forEach((el) => {
                    if (el.type === "text") {
                        const inside =
                            el.x >= rect.x &&
                            el.y >= rect.y &&
                            el.x + el.width <= rect.x + rect.width &&
                            el.y + el.height <= rect.y + rect.height;

                        if (inside) textsInside.push(el);
                    }
                });
            }
        });

        // ✅ Also extract arrow labels
        const arrowLabels = [];

        selectedElements.forEach((el) => {
            if (el.type === "arrow") {
                const label = elements.find(
                    (txt) => txt.type === "text" && txt.containerId === el.id
                );
                if (label) arrowLabels.push(label);
            }
        });

        // console.log("Selected Elements:", selectedElements);
        // console.log("Text Inside Rectangle:", textsInside);
        const combined = [...selectedElements, ...textsInside];
        parseFlow(combined)
        console.log("Selected Elements:", combined);
        // console.log("ALL ELEMENTS:", elements);
    };

    const sendCommandsToBackend = (commands) => {
        console.log("sending commands: " + commands)
        console.log("IN ExcaliDRaw", ws)
        ws?.wsRef?.current?.send(JSON.stringify({ type: "commands", data: commands }));
    }

    // const sendCommandsToBackend = (commands) => {
    //     console.log("sending commands:", commands);

    //     commands.forEach(cmd => {
    //         if (cmd === "\\x04" || cmd === "\x04") {
    //             // ✅ send raw CTRL-D, NO JSON
    //             ws.current.send(new Uint8Array([0x04]));
    //         } else {
    //             // ✅ normal JSON commands
    //             ws.current.send(JSON.stringify({
    //                 type: "commands",
    //                 data: [cmd]
    //             }));
    //         }
    //     });
    // };



    function parseFlow(selectedElements) {
        if (!selectedElements || !Array.isArray(selectedElements)) return [];


        // Separate by type
        const rectangles = selectedElements.filter(el => el.type === "rectangle");
        const texts = selectedElements.filter(el => el.type === "text");
        const arrows = selectedElements.filter(el => el.type === "arrow");


        console.log("in parse flow")

        console.log(rectangles)
        console.log(texts)
        console.log(arrows)

        // ✅ 1. Map rectangleId → text
        const rectTextMap = {};

        rectangles.forEach(rect => {
            const textInside = texts.find(txt =>
                txt.x >= rect.x &&
                txt.y >= rect.y &&
                (txt.x + txt.width) <= (rect.x + rect.width) &&
                (txt.y + txt.height) <= (rect.y + rect.height)
            );

            rectTextMap[rect.id] = textInside ? textInside.text : null;
        });

        if (arrows.length === 0 && rectangles.length === 1) {
            const rectId = rectangles[0].id;
            const text = rectTextMap[rectId];

            if (text) {
                sendCommandsToBackend([text]);
            }

            return;
        }

        // ✅ 2. Build adjacency (arrow graph)
        const edges = [];

        arrows.forEach(arr => {
            if (arr.startBinding && arr.endBinding) {
                edges.push({
                    from: arr.startBinding.elementId,
                    to: arr.endBinding.elementId
                });
            }
        });

        // ✅ 3. Find starting node (the one no arrow points TO)
        const allTo = new Set(edges.map(e => e.to));
        const allFrom = new Set(edges.map(e => e.from));

        const startNodes = [...allFrom].filter(id => !allTo.has(id));

        if (startNodes.length === 0) return [];

        let current = startNodes[0];
        const sequence = [];

        // ✅ 4. Walk the chain
        while (current) {
            if (rectTextMap[current]) {
                sequence.push(rectTextMap[current]);
            }

            const nextEdge = edges.find(e => e.from === current);
            current = nextEdge ? nextEdge.to : null;
        }

        console.log("commands to backend", sequence)

        sendCommandsToBackend(sequence);
    }



    return (
        <div style={{ width: "100%" }} className="p-4">
            <div className="flex justify-start items-center gap-4">
                <button
                    onClick={getData}
                    className="bg-blue-500 text-white px-4 py-2 rounded shadow mb-2 self-start"
                >Run Workflow</button>

                <button
                    onClick={() => ws.current.send(JSON.stringify({ type: "commands", data: ['\x04'] }))}
                    className="bg-blue-500 text-white px-4 py-2 rounded shadow mb-2 self-start"
                >EOF</button>
                <button
                    onClick={() => ws.current.send(JSON.stringify({ type: "commands", data: ['\x04'] }))}
                    className="bg-blue-500 text-white px-4 py-2 rounded shadow mb-2 self-start"
                >Clear Terminal</button>
            </div>
            <div className="border-3 border-black rounded h-screen overflow-hidden">
                <Excalidraw excalidrawAPI={setExcalidrawAPI}
                    UIOptions={{
                        tools: {
                            selection: { visible: true },
                            rectangle: { visible: true },
                            diamond: { visible: false }, // hides diamond
                            ellipse: { visible: true },
                            arrow: { visible: true },
                            line: { visible: true },
                            laser: {
                                visible: true,
                                onToolbar: "main"  // ✅ move laser to hotbar
                            },
                            image: false  // disable image tool
                        }
                    }}

                />
            </div>
        </div>
    );
}
