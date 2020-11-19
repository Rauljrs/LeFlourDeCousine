const express = require('express');
const morgan = require('morgan');
const multer = require('multer');
require('dotenv').config({path: 'development.env'});

//const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3000;
const cors = require('cors');
const path = require('path');
const passport = require('passport');
const api = require('./routes/api');
const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.urlencoded({extended: false, limit: '10mb'}));
app.use(express.json());
//app.use("public/upload", express.static(__dirname + "/public/upload"));
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'public/uploads'),
  filename: (req, file, cb) => {
      cb(null, new Date().getTime() + path.extname(file.originalname));
  }
});

app.use(multer({storage}).single('image'));

app.use('/api', api);
app.use(passport.initialize());

app.listen(port, /*host,*/ () => console.log('Escuchando puerto: ' + port ));

app.get('/', function(req, res) {
    res.send('Page under construction.');
  });

