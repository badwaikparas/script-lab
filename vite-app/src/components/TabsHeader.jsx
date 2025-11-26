export default function TabsHeader({ tabs, activeTab, setActiveTab, setTabs }) {

    function closeTab(idx) {
        setTabs(prev => prev.filter((_, i) => i !== idx));
        if (activeTab === idx) setActiveTab(0);  // switch to first tab
    }

    return (
        <div className="flex bg-gray-900 text-white">
            {tabs.map((tab, index) => (
                <div
                    key={tab.id}
                    onClick={() => setActiveTab(index)}
                    className={`px-4 py-2 cursor-pointer ${activeTab === index ? "bg-gray-700" : ""}`}
                >
                    {tab.title}
                    <button onClick={() => closeTab(index)}> × </button>
                </div>
            ))}
        </div>
    );
}
