'use strict';

const zeroEks = require('0x');
const yargs = require('yargs');
const os = require('os');

async function capture (serverPath, configPath) {
	const opts = {
		argv: [serverPath, configPath],
		workingDir: os.tmpdir()
	};
	try {
		console.log('Starting 0x profiler...');
		const file = await zeroEks(opts);
		console.log(`flamegraph in ${ file }`);
	} catch (e) {
		console.error(e);
	}
}

// Usage: node profile.js serverPath configPath
const args = process.argv.slice(2);
capture(args[0], args[1]);
