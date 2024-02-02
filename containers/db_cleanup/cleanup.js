require('dotenv').config();
const fs = require('fs');
const csv = require('csv');
const path = require('path');
const EOL = require('os').EOL;
const { Client } = require('pg');
const { to } = require('pg-copy-streams');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// Set the default timezone for date objects to the system timezone
dayjs.tz.setDefault(dayjs.tz.guess());
// NOTE: Since we are using the postgres COPY command, this requires superadmin privileges
// DB configuration
const pg = require('knex')({
	client: 'pg',
	connection: {
	  host: process.env.DB_HOST,
	  port: process.env.DB_PORT,
	  user: process.env.DB_USER,
	  database: process.env.DB_NAME,
	  password: process.env.DB_PASSWORD,
	},
});

const pinClient = new Client({
		  host: process.env.DB_HOST,
		  port: process.env.DB_PORT,
		  user: process.env.DB_USERNAME,
		  database: process.env.DB_NAME,
		  password: process.env.DB_PASSWORD,
});

const vhersClient = new Client({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USERNAME,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD,
});

// Get timestamps for now and deletion interval
const retentionIntervalMonths = Math.abs(parseInt(process.env.RENTENTION_MONTHS));
const now = dayjs();
const retainUntil = now.subtract(retentionIntervalMonths, 'month');
const fileTimeString = now.format('YYYY-MM-DD-HH-mm-ss');
const retainUntilString = retainUntil.format('YYYY-MM-DD HH:mm:ss.SSS ZZ');

// Create directory for entries
const dir = `./deleted/${fileTimeString}`
if (!fs.existsSync(dir)){
	fs.mkdirSync(dir, { recursive: true });
}

// Create files
const vhersOutFile = path.join( __dirname, 'deleted', fileTimeString, 'vhers_audit_log.csv');
const pinOutFile = path.join( __dirname, 'deleted', fileTimeString, 'pin_audit_log.csv');
const vhersWriteStream = fs.createWriteStream(vhersOutFile);
const pinWriteStream = fs.createWriteStream(pinOutFile);

// Csv transforms
const parse = csv.parse();

const transform = csv.transform((row, cb) => {
    result = row.join(',') + EOL;
    cb(null, result);
});

const pinParse = csv.parse();

const pinTransform = csv.transform((row, cb) => {
    result = row.join(',') + EOL;
    cb(null, result);
});

// Copy functions
function async_vhers_output() {
	return new Promise(function(resolve, reject) {
		const vhersStream = vhersClient.query(to(`COPY (SELECT * FROM public.vhers_audit_log WHERE created_at < '${retainUntilString}') TO STDOUT WITH (FORMAT CSV, HEADER)`));
		vhersStream.pipe(parse).pipe(transform).pipe(vhersWriteStream);
		vhersStream.on('end', () => { return resolve()});
		vhersStream.on('error', (err) => {return reject(err)});
	})
}

function async_pin_output() {
	return new Promise(function(resolve, reject) {
		const pinStream = pinClient.query(to(`COPY (SELECT * FROM public.pin_audit_log WHERE log_created_at < '${retainUntilString}') TO STDOUT WITH (FORMAT CSV, HEADER)`));
		pinStream.pipe(pinParse).pipe(pinTransform).pipe(pinWriteStream);
		pinStream.on('end', () => { return resolve()});
		pinStream.on('error', (err) => {return reject(err)});
	})
}

// Copy function IIFE (this gets arounds not allowing async functions outside of modules)
( async() => {
	await vhersClient.connect();
	await pinClient.connect();
	const promises = [];
	promises.push(async_vhers_output());
	promises.push(async_pin_output());
	Promise.all(promises).then(function AcceptHandler() {
		delete_entries();
	}, function ErrorHandler(error) {
		console.log(error);
		process.exit(1);
	});
	
})();

// Entry deletion function
function delete_entries() {
	pg('vhers_audit_log').where('created_at', '<', retainUntilString).delete().then(
		() => {
			pg('pin_audit_log').where('log_created_at', '<', retainUntilString).delete().then(
				() => {
					vhersClient.end();
					pinClient.end();
					console.log(`Successfully deleted audit log entries prior to ${retainUntilString}`);
					process.exit(0);
				},
				(err) => {
					console.log(err);
					process.exit(1);
				}
			);
		}, 
		(err) => {
			console.log(err);
			process.exit(1);
		}
	);
}