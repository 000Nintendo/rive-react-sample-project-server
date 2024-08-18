const express = require("express");

var bodyParser = require('body-parser')
const app = express();
app.use(express.json());

const cors = require("cors");
const router = require('./routes/router')

const corsOptions = {
    origin: ["http://localhost:5173"],
}

app.use(cors(corsOptions));
app.use('/', router);

app.listen(8080, () => {
    console.log("server started on port 8080")
})