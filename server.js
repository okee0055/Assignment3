var path = require('path');
var http = require('http');
var fs = require('fs');
var url = require('url');
var sqlite3 = require('sqlite3').verbose();

var multiparty = require('multiparty');

var mime = require('./src/mime.js');

var port = 8002;
var public_dir = path.join(__dirname, 'public');

var db = new sqlite3.Database('.src/imdb.sqlite3, sqlite3.OPEN_READWRITE, (err) => {
	if(err) {
		console.log(err.message);
		}//if err
		console.log('Connected to database');
});

db.serialize(() => {
	db.each("SELECT * FROM TITLES WHERE primary_title like 'Zoolander%'", (err, row) => {
	if(err) {
	console.log(err.message);
	}//if error
	console.log(row);
	});
});
var server = http.createServer((req, res) => {
    var req_url = url.parse(req.url);
    var filename = req_url.pathname.substring(1);

    if(filename === '') filename = 'index.html';

    if(req.method === 'GET') {
        fs.readFile(path.join(public_dir, filename), (err, data) => {
            if(err)
            {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.write('Oh no! Couldn\'t find that page!');
                res.end();
            }
            else{
                var ext = path.extname(filename).substring(1);
                console.log(' serving file ' + filename + ' (type = ' + mime.mime_types[ext] + ')');
                console.log(' used mime module version: ' + mime.version);
                res.writeHead(200, {'Content-Type': mime.mime_types[ext] || 'text/plain'});
                res.write(data);
                res.end();
            }

        });

    }

    else if(req.method === 'POST'){
        if(filename === 'query'){
            var form = new multiparty.Form();
            form.parse(req, (err, fields, files) =>  {
                console.log(fields);
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.write('Successfully subscribed!');
                res.end();
            });//formparse
          }//subscribe
        }//post request
      });
    console.log(' now listening at port ' + port);

    server.listen(port, '0.0.0.0');


                                                  57,1          35%
