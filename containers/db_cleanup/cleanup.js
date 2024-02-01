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
	  user: process.env.DB_USER,
	  database: process.env.DB_NAME,
	  password: process.env.DB_PASSWORD,
	},
});

const retentionIntervalMonths = Math.abs(parseInt(process.env.RENTENTION_MONTHS));
const now = dayjs();
const retainUntil = now.subtract(retentionIntervalMonths, 'month');
const fileTimeString = `${now.toDate()}-${now.hour().toPrecision(2)}:${now.minute().toPrecision(2)}:${now.second().toPrecision(2)}`;
const retainUntilString = retainUntil.format('YYYY-MM-DD HH:mm:ss.SSS ZZ');

// change to force deploy
// COPY logs that are about to be deleted to csv
// \\g /deleted/vhers-audit-log.csv
// TODO: Automate storing them elsewhere?
	// pg.raw(`COPY public.vhers_audit_log TO STDOUT WITH (FORMAT CSV, HEADER)`).then(
	// 	(ret)=>{console.log(ret); process.exit(0);}, 
	// 	(err) => {console.log(err); process.exit(1);}
	// );

// const fs = require('fs');
// const csv = require('csv');
// const path = require('path');
// const EOL = require('os').EOL;
// const { Pool } = require('pg');
// const { to } = require('pg-copy-streams');

// const pool = new Pool({
// 		  host: process.env.DB_HOST,
// 		  port: process.env.DB_PORT,
// 		  user: process.env.DB_USERNAME,
// 		  database: process.env.DB_NAME,
// 		  password: process.env.DB_PASSWORD,
// 		});

// const outFile = path.join( __dirname, 'vhers_audit_log.csv');
// const writeStream = fs.createWriteStream(outFile);

// const parse = csv.parse();

// const transform = csv.transform((row, cb) => {
//     row.push('NEW_COL');
//     result = row.join(',') + EOL;
//     cb(null, result);
// });

// pool.connect(function (err, client, done) {
// 	const stream = client.query(to(`COPY public.vhers_audit_log TO STDOUT WITH (FORMAT CSV, HEADER)`))
// 	// var fileStream = fs.createReadStream('/deleted/vhers-audit-log.csv')
// 	// // fileStream.on('error', done)
// 	// stream.on('error', done)
// 	// stream.on('finish', done)
// 	// // fileStream.pipe(stream)
// 	stream.pipe(parse).pipe(transform).pipe(writeStream);
//   	stream.on('end', done)
//   	stream.on('error', done)
// });

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