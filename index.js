const Readable = require('stream').Readable;
const express = require('express');
const NodeClam = require('clamscan');
require('dotenv').config();
const app = express();
const cors = require('cors');
const fileUpload = require('express-fileupload');
const config = require('./config')
const port = process.env.SERVER_PORT && process.env.SERVER_PORT !== '' ? process.env.SERVER_PORT : 3500;

app.use(express.json());
app.use(cors())

// Middleware for attaching clamscan with the express request
app.use(async (req, _, next) => {
	req.clamscan = await new NodeClam().init({ ...config.clamscanConfig })
	next()
})
  
// Middleware for attaching files to req.files
app.use(fileUpload({ ...config.fileUploadConfig }))


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
  const scanResult = await scanFile(req.files.energuide, req.clamscan);
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