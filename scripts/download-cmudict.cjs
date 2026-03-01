const { mkdirSync, createWriteStream } = require("fs");
const https = require("https");

const URL = "https://raw.githubusercontent.com/cmusphinx/cmudict/refs/heads/master/cmudict.dict";
const DEST = "data/cmudict.dict";

mkdirSync("data", { recursive: true });

https.get(URL, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download cmudict: HTTP ${res.statusCode}`);
    process.exit(1);
  }
  res.pipe(createWriteStream(DEST));
  res.on("end", () => console.log(`Downloaded ${DEST}`));
});
