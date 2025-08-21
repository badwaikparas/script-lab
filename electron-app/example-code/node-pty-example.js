const os = require("os");
const pty = require("node-pty");

// Choose shell depending on platform
const shell = os.platform() === "win32" ? "powershell.exe" : "bash";

// Create a pseudo terminal
const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env,
});

// Listen for terminal output
ptyProcess.onData((data) => {
    process.stdout.write(data);
});

// Run `ls` after terminal starts
if (os.platform() === "win32") {
    ptyProcess.write("dir\r"); // On Windows
} else {
    ptyProcess.write("ls\r");  // On Linux/Mac
}
