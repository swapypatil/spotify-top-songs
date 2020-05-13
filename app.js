const express = require("express");

const app = express();

const {getTop10} = require('./routes/getTop10');
const {getRelated100} = require('./routes/getRelated100');

var port = process.env.PORT || 8080;

app.set('view engine', 'ejs');
app.use(express.static('views'));

app.get('/', function(req, res){
  console.log('Got a request');
  res.render('public/index.ejs');
});

app.get('/getTop10', getTop10);

app.get('/getRelated100', getRelated100);

//Always Keep * route as last route
app.get('*', function(req, res){
  res.render('public/error404.ejs');
});

app.listen(port, ()=>{
  console.log('Listening on ' + port);
});