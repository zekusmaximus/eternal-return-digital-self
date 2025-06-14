const { spawn } = require('child_process');
const path = require('path');

// Start the vite dev server with explicit node path for security
const nodeExecutable = process.execPath; // Use the same Node.js executable that's running this script
const viteProcess = spawn(nodeExecutable, [path.join(__dirname, 'node_modules/vite/bin/vite.js')], {
  stdio: 'inherit',
  shell: false // Explicitly disable shell for security
});

viteProcess.on('error', (error) => {
  console.error('Error starting vite:', error);
});

viteProcess.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
});

console.log('Starting Vite development server...');
