const os = require('os');

const cpuInfo = (os.cpus()[0]?.model || '').toLowerCase();

const isAMD = cpuInfo.includes('amd');

let Overlay = null;

if (os.platform() === 'win32' && isAMD) {
	try {
		Overlay = require('./electron-overlay.node');
	} catch (error) {
		console.error('Failed to load electron-overlay on Windows:', error);
	}
}

module.exports = Overlay;
