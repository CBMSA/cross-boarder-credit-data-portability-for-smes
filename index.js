const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));

app.post("/upload", upload.single("csvFile"), (req, res) => {
  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => {
      results.push({
        region: data.Region,
        allocated: parseFloat(data.Allocated),
        spent: parseFloat(data.Spent)
      });
    })
    .on("end", () => {
      fs.unlinkSync(req.file.path);
      res.json(results);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
