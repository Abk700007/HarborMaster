const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Only run on Vercel build containers
if (process.env.VERCEL) {
  console.log('--- Vercel Environment Detected: Installing Coral CLI ---');
  try {
    const binDir = path.join(process.cwd(), 'bin');
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Run the official installation script with the custom installation directory
    console.log('Running installation script...');
    execSync('curl -fsSL https://withcoral.com/install.sh | CORAL_INSTALL_DIR=./bin sh', {
      stdio: 'inherit',
      env: {
        ...process.env,
        CORAL_INSTALL_DIR: './bin'
      }
    });

    console.log('Coral CLI binary installed at ./bin/coral successfully.');
  } catch (err) {
    console.error('Failed to download/install Coral CLI during Vercel build:', err);
    process.exit(1);
  }
} else {
  console.log('Skipping Vercel Coral installation: Local development detected.');
}
