const express = require('express');
const NodeClam = require('clamscan');
require('dotenv').config();
const app = express();
const cors = require('cors')
const fileUpload = require('express-fileupload')
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


  // Get instance by resolving ClamScan promise object
ClamScan.then(async clamscan => {
	try {
		const {isInfected, file, viruses} = await clamscan.isInfected('/some/file.zip')
		if (isInfected) console.log(`${file} is infected with ${viruses}!`)
		else console.log('File is harmless')
	} catch (err) {
		console.log('Error:', err.message)
	}
}).catch(err => {
// Handle errors that may have occurred during initialization
console.log('Initialization Error:', err.message)
});

app.post('/virus-scan', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});