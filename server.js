
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
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
app.get('/title', (req, res)=>{
    res.writeHead(200, {'Content-Type' : 'text/plain'});
    res.write('TITLE');
    res.end();
});
app.get('/name', (req, res)=>{
    res.writeHead(200, {'Content-Type' : 'text/plain'});
    res.write('NAMES');
    res.end();
});


app.post('/query', function(req, res){

    var column = '';
    if(req.body.table === 'TITLES'){
        column = 'primary_title';
    }else if(req.body.table === 'NAMES'){
        column = 'primary_name';
    }
    //var query = "SELECT * FROM " + req.body + " WHERE primary_title like \'%" + fields.condition + "%\';";

    var table_info = {rows:[]};

    db.serialize(() => {
        var stmt = db.prepare("SELECT * FROM " + req.body.table + " WHERE " + column + " LIKE ? ");
        var target = req.body.target.replace(/\*/g,"%");
    	stmt.each(target, (err, row) => {
    	    if(err) {
        	    console.log(err.message);
            }	
                table_info.rows.push(row);
    	        console.log(row);
    	}, (err, count)=>{
            //console.log(stmt);
            //console.log("count: "+count);
            stmt.finalize(()=>{res.end(JSON.stringify(table_info));});
        });

    });
    /*
    var thing = {
                    rows : [
                        {'col_1' : 'hello', 'col_2' : 'there', 'col_3' : 'ONE'},
                        {'col_1' : 'hello', 'col_2' : 'there', 'col_3' : 'TWO'},
                        {'col_1' : 'hello', 'col_2' : 'there', 'col_3' : 'THREE'}
                    ]
                };
    var json_thing = JSON.stringify(thing);
    */
});

app.listen(port, ()=> console.log('ITS WORKING... on port: ' + port));

