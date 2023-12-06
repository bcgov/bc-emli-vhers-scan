const Readable = require('stream').Readable;
const express = require('express');
const NodeClam = require('clamscan');
require('dotenv').config();
const app = express();
const cors = require('cors');
const fileUpload = require('express-fileupload');
const config = require('./config')
const port = process.env.PORT && process.env.PORT !== '' ? parseInt(process.env.PORT) : 3500;

// Middleware functions
const startTime = (req, res, next) => {
    const startTime = process.hrtime();
    res.set(
        'X-Start-Time',
        startTime[0].toString() + ',' + startTime[1].toString(),
    );
    next();
}

const responseLogger = async function (
    req,
    res,
    next,
) {
    const originalSendFunc = res.send.bind(res);
    res.send = function (body) {
        const startTimeString = res.get('X-Start-Time')?.split(',');
        const startTime = [
            Number(startTimeString[0]),
            Number(startTimeString[1]),
        ];
        const diff = process.hrtime(startTime);
        const time = diff[0] * 1e3 + diff[1] * 1e-6;
        if (res.get('X-Start-Time')) {
            res.removeHeader('X-Start-Time');
        }
		let reqBody = {}
		if (req.files && req.files.energuide && req.files.energuide.name) reqBody =  {filename: req.files.energuide.name};
		createAuditLog(
			res.statusCode,
			Number(time.toFixed(3)),
			reqBody,
			body,
		).then(() => {});
        return originalSendFunc(body);
    };
    next();
}

const apiKeyAuth = async (req, res, next) => {
    const VHERS_API_KEY =
        process.env.VHERS_API_KEY && process.env.VHERS_API_KEY !== ''
            ? process.env.VHERS_API_KEY
            : '';
    
        // Extract api key from the request header.
        const apiKey = req.header('x-api-key');

        // Check if api key exists
        if (!apiKey) {
			return res.status(401).json({
				message: 'Access Denied'
			});
		}
        if (apiKey === VHERS_API_KEY) {
            next();
        } else {
			return res.status(400).json({
				message: 'Invalid Token'
			});
		}
}

app.use(startTime);
app.use(apiKeyAuth);
app.use(express.json());
app.use(cors());
app.use(responseLogger)

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

// Middleware for attaching clamscan with the express request
app.use(async (req, _, next) => {
	req.clamscan = await new NodeClam().init({ ...config.clamscanConfig })
	next()
})
  
// Middleware for attaching files to req.files
app.use(fileUpload({ ...config.fileUploadConfig }))

const createAuditLog = async (statusCode, responseTimeMs, requestBody, responseBody) => {
	const entry = {
		endpoint_name: 'POST /virus-scan',
		status_code: Number(statusCode),
		response_time_ms: responseTimeMs,
	}
	if (requestBody) entry.request_body = requestBody;
	if (responseBody) entry.response_body = responseBody;
	try {
		await pg.insert(
			entry
		).into('vhers_audit_log'); 
	}
	catch (err) {
		console.log(err);
	}
}

const scanFile = async (file, clamscan) => {
	const fileStream = Readable()
	fileStream.push(file.data)
	fileStream.push(null)
	
	// const result = await clamscan.isInfected(__dirname + '/tmp/filename');
	const result = await clamscan.scanStream(fileStream);

	return {
	  filename: file.name,
	  is_infected: result.isInfected,
	  viruses: result.viruses,
	}
}

app.post('/virus-scan', async (req, res) => {
	if (!req.files || ! req.files.energuide) {
		return res.status(409).json({
			message: 'No energuide file provided for scan'
		})
	}
	// await req.files.energuide.mv('./tmp/' + req.files.energuide.name);
  let scanResult; 
  try {
  	scanResult = await scanFile(req.files.energuide, req.clamscan);
  } catch (err) {
	console.log(err);
	return res.status(500).json({
		message: "Scan failed due to internal server error"
	})
  }
  console.log(scanResult);

  if (scanResult.is_infected === true || scanFile.is_infected === null) {
    return res.status(502).json({
      clean: false
    })
  }
  return res.status(200).json({
    clean: true
  });
});

app.listen(port, () => {
  console.log(`Virus scan listening on port ${port}`);
});