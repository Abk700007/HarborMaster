const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const binDir = path.join(process.cwd(), 'bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const isWindows = process.platform === 'win32';
const coralBinName = isWindows ? 'coral.exe' : 'coral';
const coralBinPath = path.join(binDir, coralBinName);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (Status Code: ${response.statusCode})`));
        return;
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          resolve();
        });
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function installCoral() {
  if (fs.existsSync(coralBinPath)) {
    console.log(`Coral CLI binary already exists at ${coralBinPath}`);
    return;
  }

  console.log(`--- Installing Coral CLI for ${process.platform} ---`);
  
  if (isWindows) {
    const zipPath = path.join(process.cwd(), 'coral.zip');
    const downloadUrl = 'https://github.com/withcoral/coral/releases/download/v0.4.2/coral-x86_64-pc-windows-msvc.zip';
    console.log(`Downloading ${downloadUrl}...`);
    try {
      await downloadFile(downloadUrl, zipPath);
      console.log('Extracting zip...');
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${binDir}' -Force"`, { stdio: 'inherit' });
      
      // Clean up zip
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
      console.log(`Successfully installed Coral CLI to ${coralBinPath}`);
    } catch (err) {
      console.error('Failed to download/install Windows Coral binary:', err);
      process.exit(1);
    }
  } else {
    // Unix / macOS
    try {
      console.log('Running official installer script...');
      execSync('curl -fsSL https://withcoral.com/install.sh | CORAL_INSTALL_DIR=./bin sh', {
        stdio: 'inherit',
        env: {
          ...process.env,
          CORAL_INSTALL_DIR: './bin'
        }
      });
      console.log('Successfully installed Coral CLI.');
    } catch (err) {
      console.error('Failed to download/install Unix Coral binary:', err);
      process.exit(1);
    }
  }
}

installCoral();
