
//modules, these are pre-installed, but node has many more, more tha other languages
var fs =  require('fs'); //allow access to file system
var path = require('path'); //
var http = require('http');
var url = require('url');
var mime = require('./src/mime.js');
var express = require('express');
var app = express();
var sqlite3 = require('sqlite3').verbose();
var multiparty = require('multiparty');

var port = 8014;
//files we want to serv will be in this dir
var public_dir = path.join(__dirname, 'public');
var src_dir = path.join(__dirname, 'src');

var db = new sqlite3.Database('src/imdb.sqlite3', sqlite3.OPEN_READWRITE, (err) => {
	if(err) {
		console.log(err.message);
	}
		console.log('Connected to database');
});

app.get('/', function(req, res){
    req_url = url.parse(req.url);
    fs.readFile(path.join(public_dir, 'index.html'), 'utf8', (err, data) => {
        if(err){
           console.log(err); 
           res.writeHead(404, {'Content-Type' : 'text/plain'});
           res.write('Could not find file');
           res.end();
        }
        else{
            var result = data.replace(/{{unique_string}}/g, 'Movie/TV Database');
            res.writeHead(200, {'Content-Type' : 'text/html'});
            res.write(result);
            res.end();
        }
    });
    //res.sendFile(path.join(public_dir, 'index.html'));
});
app.get('/index.html', (req, res)=>{
    res.sendFile(path.join(public_dir, 'index.html'));
});
app.get('/title.html', (req, res)=>{
});
app.get('person.html', (req, res)=>{
});


app.post('/query', function(req, res){

    var form = new multiparty.Form();
    form.parse(req, (err, fields, files) => {
        console.log(fields);
        var query = "SELECT * FROM " + fields.table + " WHERE primary_title like \'%" + fields.condition + "%\';";
        console.log(query);
        db.serialize(() => {
        	db.each(query, (err, row) => {
        	if(err) {
            	console.log(err.message);
            }	
        	    console.log(row);
        	});
        });

        res.writeHead(200, {'Content-Type' : 'text/plain'});
        res.write('Successfully subscribed');
        res.end();
    });
});

app.listen(port, ()=> console.log('ITS WORKING... on port: ' + port));
