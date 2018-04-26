
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
var poster = require('imdb_poster.js');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

console.log(poster);

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
           res.write('Could not find file / ');
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
    fs.readFile(path.join(public_dir, 'title.html'), 'utf8', (err, data) => {
        if(err){
           console.log(err); 
           res.writeHead(404, {'Content-Type' : 'text/plain'});
           res.write('Could not find file title');
           res.end();
        }
        else{
            var titles_promise = new Promise((resolve, reject) => {
                var titles_stmt = db.prepare("SELECT * FROM TITLES WHERE tconst = ? ");
                titles_stmt.get(req.query.tconst, (err, row) => {
                    if(err) {
                        console.log(err.message);
                        reject(err);
                    }else{
                        titles_stmt.finalize();
                        resolve(row);
                    }
                }); //titles_stmt.get
            });
            var ratings_promise = new Promise((resolve, reject) => {
                var ratings_stmt = db.prepare("SELECT * FROM RATINGS WHERE tconst = ? ");
                ratings_stmt.get(req.query.tconst, (err, row) => {
                    if(err){
                        console.log(err.message);
                        reject(err);
                    }else{
                        ratings_stmt.finalize();
                        resolve(row);
                    }
                }); //results_stmt.get
            });
            
            var poster_promise = new Promise((resolve, reject) => {
                poster = require('imdb_poster.js');
                poster.GetPosterFromTitleId(req.query.tconst, (err, data) => {
                    if(err) {
                        console.log(err);
                    }//if
                    else {
                        console.log(data);
                        resolve(data);
                    }//else
                });//getPoster
            });//poster_promise

            var top_bill_promise = new Promise((resolve, reject) => {
                var top_bill_stmt = db.prepare("SELECT primary_name, primary_profession, birth_year, death_year, PRINCIPALS.nconst FROM NAMES INNER JOIN PRINCIPALS ON NAMES.nconst = PRINCIPALS.nconst WHERE tconst = ? ORDER BY ordering");
                top_bill_stmt.all(req.query.tconst, (err, rows) => {
                    if(err){
                        console.log(err);
                        reject(err);
                    }else{
                        top_bill_stmt.finalize();
                        resolve(rows);
                    }
                });
            });

            Promise.all([titles_promise, ratings_promise, poster_promise, top_bill_promise]).then((rows)=>{
                console.log(rows[0]);
                console.log(rows[1]);
                console.log(rows[2]);
                console.log(JSON.parse(JSON.stringify(rows[3])));
                poster = 'https://'+rows[2].host + rows[2].path;

                data = data.replace(/\*\*\*MOVIE TITLE\*\*\*/g, rows[0].primary_title);
                data = data.replace(/\*\*\*TITLE TYPE\*\*\*/g, rows[0].title_type);
                data = data.replace(/\*\*\*START\*\*\*/g, rows[0].start_year);
                data = data.replace(/\*\*\*END\*\*\*/g, rows[0].end_year);
                data = data.replace(/\*\*\*RUN TIME\*\*\*/g, rows[0].runtime_minutes);
                data = data.replace(/\*\*\*GENRE\*\*\*/g, rows[0].genres);
                data = data.replace(/\*\*\*AVERAGE RATE\*\*\*/g, rows[1].average_rating);
                data = data.replace(/\*\*\*NUM VOTES\*\*\*/g, rows[1].num_votes);
                data = data.replace(/\*\*\*POSTER\*\*\*/g, poster);
                data = data.replace(/\*\*\*ROWS\*\*\*/g, JSON.stringify(rows[3])); 
                console.log("\n\n"+data+"\n\n");
                res.writeHead(200, {'Content-Type' : 'text/html'});       
                res.write(data);
                res.end();
            }).catch((err) => {
                console.log(err);
            });


        } //else
    }); //fs.readFile
}); //app.get on '/tite'

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
    // var query = "SELECT * FROM " + req.body + " WHERE primary_title like \'%" + fields.condition + "%\';";

    // var table_info = {rows:[]};

    db.serialize(() => {
        var stmt = db.prepare("SELECT * FROM " + req.body.table + " WHERE " + column + " LIKE ? ");
        var target = req.body.target.replace(/\*/g,"%");
    	stmt.all(target, (err, rows) => {
    	    if(err) {
        	    console.log(err.message);
            }	
            //table_info.rows.push(row);
    	    console.log(rows);
            res.end(JSON.stringify(rows));
        });
        stmt.finalize();

    });
});

app.listen(port, ()=> console.log('ITS WORKING... on port: ' + port));

