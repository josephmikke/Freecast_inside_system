const cp = require('child_process');
const fs = require('fs');
const os = require('os');

const excludedFolders = ['node_modules'];
const installPromises = [];

const checkLayersTree = (baseDir) => {
  let stat = fs.statSync(`${baseDir}`);
  if (!stat.isDirectory()) {
    console.log(`${baseDir} is a file`);
    return;
  }
  const dirs = fs.readdirSync(baseDir);
  dirs.forEach((dir) => {
    stat = fs.statSync(`${baseDir}/${dir}`);
    if (!excludedFolders.includes(dir) && stat.isDirectory()) checkLayersTree(`${baseDir}/${dir}`);
  });
  if (fs.existsSync(`${baseDir}/package.json`)) {
    console.log(`Installing dependencies in ${baseDir}...`);
    const npmCmd = os.platform().startsWith('win') ? 'npm.cmd' : 'npm';

    // install folder - use execSync for synchronous execution
    const promise = new Promise((resolve, reject) => {
      const child = cp.spawn(npmCmd, ['i'], {
        env: process.env,
        cwd: baseDir,
        stdio: 'inherit',
        shell: true,
      });
      
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`npm install failed in ${baseDir} with code ${code}`));
        } else {
          resolve();
        }
      });
      
      child.on('error', (err) => {
        reject(err);
      });
    });
    
    installPromises.push(promise);
  }
};

checkLayersTree('layers');
checkLayersTree('routes');

// Wait for all installations to complete
Promise.all(installPromises)
  .then(() => {
    console.log('All sub-dependencies installed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error installing sub-dependencies:', err);
    process.exit(1);
  });
