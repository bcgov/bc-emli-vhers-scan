require('dotenv').config();
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
	  user: process.env.DB_USERNAME,
	  database: process.env.DB_NAME,
	  password: process.env.DB_PASSWORD,
	},
	pool: {min: 0, max: parseInt(process.env.DB_MAX_POOL)}
});

const retentionIntervalMonths = Math.abs(parseInt(process.env.RENTENTION_MONTHS));
const now = dayjs();
const retainUntil = now.subtract(retentionIntervalMonths, 'month');
const fileTimeString = `${now.toDate()}-${now.hour().toPrecision(2)}:${now.minute().toPrecision(2)}:${now.second().toPrecision(2)}`;
const retainUntilString = retainUntil.format('YYYY-MM-DD HH:mm:ss.SSS ZZ');

// COPY logs that are about to be deleted to csv
// TODO: Automate storing them elsewhere?
// try {
// 	pg.raw(`\\COPY public.vhers_audit_log TO '/deleted/vhers-audit-log.csv' WITH (FORMAT CSV, HEADER);`).then();
// } catch (err) {
// 	console.log(err);
// 	exit(1); // cannot continue without saving backup
// }

// pool.connect(function (err, client, done) {
// 	var stream = client.query(to(`COPY public.vhers_audit_log TO STDOUT`))
// 	// var fileStream = fs.createReadStream('/deleted/vhers-audit-log.csv')
// 	// fileStream.on('error', done)
// 	stream.on('error', done)
// 	stream.on('finish', done)
// 	// fileStream.pipe(stream)
// });

// const fs = require('node:fs');
// const { Pool } = require('pg');
// const { to } = require('pg-copy-streams');

// var pool = new Pool({
// 		  host: process.env.DB_HOST,
// 		  port: process.env.DB_PORT,
// 		  user: process.env.DB_USERNAME,
// 		  database: process.env.DB_NAME,
// 		  password: process.env.DB_PASSWORD,
// 		});

// const exec = require('child_process').exec;

// Delete the logs 
pg('vhers_audit_log').where('created_at', '<', retainUntilString).delete().then(
	() => {
		pg('pin_audit_log').where('log_created_at', '<', retainUntilString).delete().then(
			() => {
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