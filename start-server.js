const { spawn } = require('child_process');

// Start the vite dev server
const viteProcess = spawn('node', ['node_modules/vite/bin/vite.js'], {
  stdio: 'inherit',
  shell: true
});

viteProcess.on('error', (error) => {
  console.error('Error starting vite:', error);
});

viteProcess.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
});

console.log('Starting Vite development server...');
