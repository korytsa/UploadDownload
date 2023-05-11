import express from 'express';
import cors from 'cors';
import fs from 'fs';
import Busboy from 'busboy';
import path from 'path';

const app = express();
import {
	pipeline
} from 'stream';
import * as url from 'url';


const uniqueAlphaNumericId = (() => {
	const heyStack = '0123456789abcdefghijklmnopqrstuvwxyz';
	const randomInt = () => Math.floor(Math.random() * Math.floor(heyStack.length));

	return (length = 24) => Array.from({
		length
	}, () => heyStack[randomInt()]).join('');
})();

const getFilePath = (fileName, fileId) => `./uploads/file-${fileId}-${fileName}`;

app.use(express.json());
app.use(cors());

app.post('/upload-request', (req, res) => {
	if (!req.body || !req.body.fileName) {
		res.status(400).json({
			message: 'Missing "fileName"'
		});
	} else {
		const fileId = uniqueAlphaNumericId();
		fs.createWriteStream(getFilePath(req.body.fileName, fileId), {
			flags: 'w'
		});
		res.status(200).json({
			fileId
		});
	}
});

app.get('/upload-status', async (req, res) => {
	if (req.query && req.query.fileName && req.query.fileId) {

		try {
			const stats = await fs.promises.stat(getFilePath(req.query.fileName, req.query.fileId));
			res.status(200).json({
				totalChunkUploaded: stats.size,
			});
		} catch (err) {
			console.error('failed to read file', err);
			res.status(400).json({
				message: 'No file with such credentials',
				credentials: req.query,
			});
		}
	}
});

app.post('/upload', (req, res) => {
	const contentRange = req.headers['content-range'];
	const fileId = req.headers['x-file-id'];

	if (!contentRange) {
		console.log('Missing Content-Range');
		return res.status(400).json({
			message: 'Missing "Content-Range" header'
		});
	}

	if (!fileId) {
		console.log('Missing File Id');
		return res.status(400).json({
			message: 'Missing "X-File-Id" header'
		});
	}

	const match = contentRange.match(/bytes=(\d+)-(\d+)\/(\d+)/);

	if (!match) {
		console.log('Invalid Content-Range Format');
		return res.status(400).json({
			message: 'Invalid "Content-Range" Format'
		});
	}

	const rangeStart = Number(match[1]);
	const rangeEnd = Number(match[2]);
	const fileSize = Number(match[3]);

	if (rangeStart >= fileSize || rangeStart >= rangeEnd || rangeEnd > fileSize) {
		return res.status(400).json({
			message: 'Invalid "Content-Range" provided'
		});
	}

	const busboy = new Busboy({
		headers: req.headers
	});

	busboy.on('file', async (_, file, fileName) => {
		const filePath = getFilePath(fileName, fileId);
		if (!fileId) {
			req.pause();
		}
		try {
			const stats = await fs.promises.stat(filePath);
			if (stats.size !== rangeStart) {
				return res.status(400).json({
					message: 'Bad "chunk" provided'
				});
			}
			file.pipe(fs.createWriteStream(filePath, {
					flags: 'a'
				}))
				.on('error', (e) => {
					console.error('failed upload', e);
					res.sendStatus(500);
				});
		} catch (err) {
			console.log('No File Match', err);
			res.status(400).json({
				message: 'No file with such credentials',
				credentials: req.query
			});
		}
	});

	busboy.on('error', (e) => {
		console.error('failed upload', e);
		res.sendStatus(500);
	})

	busboy.on('finish', () => {
		res.sendStatus(200);
	});

	req.pipe(busboy);
});


// app.get('/download', (req, res, next) => {
// 	const __dirname = url.fileURLToPath(new URL('.',
// 		import.meta.url));
// 	res.setHeader('Content-Type', 'text/html');
// 	const readStream = fs.createReadStream(__dirname + 'download.html');
// 	pipeline(readStream, res, (err) => err && console.log(err));
// })

app.get('/video-stream', (req, res, next) => {
	const pathToVideo = 'uploads/Thunk.mp4';

	const resolvedPath = path.resolve(pathToVideo);
	const fileSize = fs.statSync(resolvedPath).size;
	const range = req.headers.range;

	if (!range) {
		res.writeHead(200, {
			'Content-Length': fileSize,
			'Content-Type': 'video/mp4',
		});

		const readStream = fs.createReadStream(resolvedPath);
		return pipeline(readStream, res, (err) => {
			if (err && (!err.code === 'ERR_STREAM_PREMATURE_CLOSE')) {
				console.log(err);
			}
		});
	}
	const parts = range.replace(/bytes=/, '').split('-');
	const start = parseInt(parts[0], 10);
	const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
	const chunkSize = end - start + 1;

	const readStream = fs.createReadStream(resolvedPath, {
		start,
		end
	});

	res.writeHead(206, {
		'Content-Range': `bytes ${start}-${end}/${fileSize}`,
		'Accept-Ranges': 'bytes',
		'Content-Length': chunkSize,
		'Content-Type': 'video/mp4',
	});
	return pipeline(readStream, res, (err) => {
		if (err && (!err.code === 'ERR_STREAM_PREMATURE_CLOSE')) {
			console.log(err);
		}
	})
});

app.listen(1234);
console.log('listening on port 1234');