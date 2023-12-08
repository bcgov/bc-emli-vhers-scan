require('dotenv').config();

const clamscanConfig = {
	// removeInfected: true, // If true, removes infected files
	// quarantineInfected: false, // False: Don't quarantine, Path: Moves files to this place.
	// scanLog: process.env.CLAM_SCAN_LOG && process.env.CLAM_SCAN_LOG != 'null'? process.env.CLAM_SCAN_LOG : null, // Path to a writeable log file to write scan results into
	debugMode: process.env.CLAM_DEBUG_MODE ? /^true$/i.test(process.env.CLAM_DEBUG_MODE) : true, // Whether or not to log info/debug/error msgs to the console
	// fileList: null, // path to file containing list of files to scan (for scanFiles method)
	scanRecursively: true, // If true, deep scan folders recursively
	// clamscan: {
	//   path: process.env.CLAMD_PATH ? process.env.CLAMD_PATH :'/opt/homebrew/bin/clamscan', // Path to clamscan binary on your server
	//   db: null, // Path to a custom virus definition database
	//   scanArchives: true, // If true, scan archives (ex. zip, rar, tar, dmg, iso, etc...)
	//   active: process.env.CLAMD_ACTIVE ? /^true$/i.test(process.env.CLAMD_ACTIVE) : true // If true, this module will consider using the clamscan binary
	// },
	clamdscan: {
	  socket: process.env.CLAMD_SOCKET && process.env.CLAMD_SOCKET != 'null'? process.env.CLAMD_SOCKET : null, // Socket file for connecting via TCP
	  host: process.env.CLAMD_HOST ? process.env.CLAMD_HOST : '127.0.0.1', // IP of host to connect to TCP interface
	  port: process.env.CLAMD_PORT ? parseInt(process.env.CLAMD_PORT) : 65615, // Port of host to use when connecting via TCP interface
	  timeout: process.env.CLAMD_TIMEOUT ? parseInt(process.env.CLAMD_TIMEOUT) : 120000, // Timeout for scanning files
	  localFallback: false, // Do no fail over to binary-method of scanning
	  path: process.env.CLAMD_PATH ? process.env.CLAMD_PATH : '/opt/homebrew/bin/clamscan', // Path to the clamdscan binary on your server
	  // configFile: process.env.CLAMD_CONFIG_FILE && process.env.CLAMD_CONFIG_FILE != 'null' ? process.env.CLAMD_CONFIG_FILE : null, // Specify config file if it's in an unusual place
	  multiscan: process.env.CLAMD_MULTI_SCAN ? /^true$/i.test(process.env.CLAMD_MULTI_SCAN) : false, // Scan using all available cores! Yay!
	  reloadDb: false, // If true, will re-load the DB on every call (slow)
	  // active: process.env.CLAMD_ACTIVE ? /^true$/i.test(process.env.CLAMD_ACTIVE) : true, // If true, this module will consider using the clamdscan binary
	  bypassTest: process.env.CLAMD_BYPASS_TEST ? /^true$/i.test(process.env.CLAMD_BYPASS_TEST) : false, // Check to see if socket is available when applicable
	},
	// preference: process.env.CLAM_PREFERENCE ? process.env.CLAM_PREFERENCE :'clamdscan' // If clamdscan is found and active, it will be used by default
  }
  
  const fileUploadConfig = {
	useTempFiles: process.env.FILE_UPLOAD_TEMP_FILES ? /^true$/i.test(process.env.FILE_UPLOAD_TEMP_FILES) : true,
	limits: {
	  fileSize: process.env.FILE_SIZE_LIMIT ? parseInt(process.env.FILE_SIZE_LIMIT) : 10 * 1024 * 1024, // 10 MB
	},
	limitHandler: (req, res) => {
	  res.writeHead(413, {
		Connection: 'close',
		'Content-Type': 'application/json',
	  })
	  res.end(
		JSON.stringify({
		  success: false,
		  data: {
			error: `File size limit exceeded. Max size of uploaded file is: ${
				proccess.env.FILE_SIZE_LIMIT ? parseInt(proccess.env.FILE_SIZE_LIMIT) / 1024: 10 * 1024
			} KB`,
		  },
		})
	  )
	},
  }
  
  module.exports = {
	clamscanConfig,
	fileUploadConfig
  }