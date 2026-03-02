const { mkdirSync, createWriteStream } = require("fs");
const https = require("https");

const URL =
  "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict";
const DEST = "data/cmudict.dict";

mkdirSync("data", { recursive: true });

function download(url) {
  const req = https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      download(res.headers.location);
      return;
    }
    if (res.statusCode !== 200) {
      console.error(`Failed to download cmudict: HTTP ${res.statusCode}`);
      process.exit(1);
    }
    const ws = createWriteStream(DEST);
    res.pipe(ws);
    ws.on("finish", () => console.log(`Downloaded ${DEST}`));
    ws.on("error", (err) => {
      console.error(`Write error: ${err.message}`);
      process.exit(1);
    });
    res.on("error", (err) => {
      console.error(`Download error: ${err.message}`);
      process.exit(1);
    });
  });
  req.on("error", (err) => {
    console.error(`Request error: ${err.message}`);
    process.exit(1);
  });
}

download(URL);
