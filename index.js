// import http from 'node:http';
// import {sendHomePage} from "./src/send-home-page.js";
// import {sendVideoFile} from "./src/send-video-file.js";
// import { Uploader } from './uploader.js';

// const runnersByRouts = {
//   '/': sendHomePage,
//   '/video-stream': (req, res) => sendVideoFile({
//     req,
//     res,
//     pathToVideo: 'uploads/Thunk.mp4'
//   }),
//   '/upload': () => Uploader
// };

// const router = (req, res) => {
//   console.log(req.url)
//   try {
//     const url = req.url;
//     const runner = runnersByRouts[url];

//     if (!runner) {
//       res.statusCode = 400;
//       return res.end();
//     }

//     return runner(req, res);
//   } catch (err) {
//     console.error(err);
//     res.statusCode = 500;
//     res.statusMessage = 'Internal server error occurred';
//     res.end();
//   }
// }

// const PORT = 8000;
// const server = http.createServer(router);
// server.listen(PORT, () => {
//   console.log(`Server started on port ${PORT}, follow this link http://localhost:${PORT}/`);
// });