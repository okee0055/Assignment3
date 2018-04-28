
//modules, these are pre-installed, but node has many more, more tha other languages
var fs =  require('fs'); //allow access to file system
var path = require('path'); //
var http = require('http');
var url = require('url');
//var mime = require('./src/mime.js');
var express = require('express');
var app = express();
var sqlite3 = require('sqlite3').verbose();
var multiparty = require('multiparty');
var bodyParser = require('body-parser');
var poster = require('imdb_poster.js');
var query = require('querystring');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//console.log(poster);

var port = 8026;
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



app.get('/about', function(req, res){
    req_url = url.parse(req.url);
    fs.readFile(path.join(public_dir, 'about.html'), 'utf8', (err, data) => {
        if(err){
           console.log(err);
           res.writeHead(404, {'Content-Type' : 'text/plain'});
           res.write('Could not find file / ');
           res.end();
        }
        else{
          //  var result = data.replace(/{{unique_string}}/g, 'Movie/TV Database');
            res.writeHead(200, {'Content-Type' : 'text/html'});
            res.write(data);
            res.end();
        }
    });
    //res.sendFile(path.join(public_dir, 'index.html'));
});

app.get('/src/kelsey', (req, res) => {
	fs.readFile(path.join(src_dir, 'kelsey.jpg'), (err, data) => {

	})
})

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
									//console.log("Top Billed");
                    if(err){
                        console.log(err);
                        reject(err);
                    }else{
													console.log("Rows before directors/writers " + rows);
													var topBilled_nconst = rows.map((e) => { return e.nconst;});
													var director_promise = new Promise((resolve, reject) => {
														var director_stmt = db.prepare("SELECT directors FROM CREW WHERE tconst = ?");
														director_stmt.get(req.query.tconst, (err, row) => {
															if(err) {
																console.log(err);
																reject(err);
															} else {
																resolve(row);

															}
														});

													});//director promse

													var writer_promise = new Promise((resolve, reject) => {
														var writer_stmt = db.prepare("SELECT writers FROM CREW WHERE tconst = ?");
														writer_stmt.get(req.query.tconst, (err, row) => {
															if(err){
																console.log(err);
																reject(err);
															} else {
																resolve(row);
															}
														});

													});//Writer promise

												Promise.all([director_promise, writer_promise]).then((result) => {
														top_bill_stmt.finalize();
														console.log(result[0]);
														console.log(result[1]);



														if(result[1].writers != null) {
															var writers = result[1].writers.split(',');
														for(var i=0; i<writers.length; i++)
														{
															if(topBilled_nconst.indexOf(writers[i]) == -1)
															{
																var writerStatment = db.prepare("SELECT * FROM NAMES WHERE nconst = ?");
																var writerResult = writerStatment.get(writers[i], (err, results) => {
																	if(err){
																		console.log(err);
																		reject(err);
																	} else {
																		rows.push(results);
																	}
																});
															}
														}//writer for loop
													}

                          console.log("DIRECTORS: \n\n");
                          console.log(result[0]);
                                                        console.log("\n\n");
													if(result[0].directors != null && typeof result[0] !== 'undefined') {
														var directors = result[0].directors.split(',');
														for(var i=0; i<directors.length; i++)
														{
															if(topBilled_nconst.indexOf(directors[i]) == -1)
															{
																var writerStatment = db.prepare("SELECT * FROM NAMES WHERE nconst = ?");
																var result = writerStatment.get(directors[i], (err, result) => {
																	if(err){
																		console.log(err);
																		reject(err);
																	} else {
																		rows.push(result);
																	}
																});
															}
														}//director
													}

														resolve(rows);


												}).catch((err) => {
													console.log(err);
												});//promsise .all
                    }//else
                });
            });

            Promise.all([titles_promise, ratings_promise, poster_promise, top_bill_promise]).then((rows)=>{
                //console.log(rows[0]);
                //console.log(rows[1]);
              //  console.log(rows[2]);
              //  console.log(JSON.parse(JSON.stringify(rows[3])));
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
              //  console.log("\n\n"+data+"\n\n");
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
		fs.readFile(path.join(public_dir, 'name.html'), 'utf8', (err, data) => {

			if(err) {
				console.log(err);
				res.writeHead(404, {'Content-Type': 'text/plain'});
				res.write('Could not find file title');
				res.end();
			}//if(err)
			else {
					var name_promise = new Promise((resolve, reject) => {
						var name_stmt = db.prepare("SELECT * FROM NAMES WHERE nconst = ?");
						name_stmt.get(req.query.nconst, (err, row) => {
							var finalResult = {newObs: []};
							if(err) {
								console.log(err.message);
								reject(err);
							} else {
								name_stmt.finalize();
									resolve(row);
							}// else
						});//stmt.get
					});//name_promise

					var knowTitles_promise = new Promise((resolve, reject) => {
						var knownPromise =[];
						var known_stmt = db.prepare("SELECT known_for_titles FROM NAMES WHERE nconst = ?");
						known_stmt.get(req.query.nconst, (err, row) => {
							if(err){
								console.log(err);
								reject(err);
							} else{
                known_stmt.finalize();
								var known_titles = String(row.known_for_titles).split(',');
								for(var i=0; i<known_titles.length; i++)
								{
										var title_promise = new Promise((resolve, reject) => {
											var known_stmt = db.prepare("SELECT * FROM TITLES WHERE tconst = ?");
											known_stmt.get(known_titles[i], (err, row) =>
											{
												resolve(row);
											});
										});
										knownPromise.push(title_promise);
								}

								Promise.all(knownPromise).then((results) =>
								{
									resolve(results);

								}).catch((err) => {
									reject(err);
								});
                //console.log(finalResult);
							//	resolve(finalResult);
							}//else
						});//.get
					});//promise


					var prsnPoster_promise = new Promise((resolve, reject) => {
						poster = require('imdb_poster.js');
						poster.GetPosterFromNameId(req.query.nconst, (err, data) => {
							if(err){
								console.log(err);
								reject(err);
							}
							else {
								console.log(data);
								resolve(data);
							}
						});//getPoster
					});//promise

					Promise.all([name_promise, prsnPoster_promise, knowTitles_promise ]).then((row) => {
								//console.log(row[0]);
								//console.log(row[1]);
							  //console.log("KnowTitles_Promise: ");
								/*
                              for(var i=0; i<row[2].length; i++)
									console.log(row[2][i]);
                                */
								poster = 'https://'+row[1].host + row[1].path;

								data = data.replace(/\*\*\*PERSON NAME\*\*\*/g, row[0].primary_name);
								data = data.replace(/\*\*\*BIRTH\*\*\*/g, row[0].birth_year);
								data = data.replace(/\*\*\*DEATH\*\*\*/g, row[0].death_year || 'present');
								data = data.replace(/\*\*\*PROFESSIONS\*\*\*/g, row[0].primary_profession);
								data = data.replace(/\*\*\*POSTER\*\*\*/g, poster);
								data = data.replace(/\*\*\*ROWS\*\*\*/g, JSON.stringify(row[2]));

                                //console.log("\n\n"+data+"\n\n");

								res.writeHead(200, {'Content-Type' : 'text/html'});
                res.write(data);
                res.end();

					}).catch((err) => {
						console.log(err);
					});//Promise.all
			}//else
		}); //readFile
    //res.writeHead(200, {'Content-Type' : 'text/plain'});
  //  res.write('NAMES');
    //res.end();
});//app.get on 'name'


app.post('/nameupdate', (req, res) => {
	console.log("In POST ");
	var req_url = url.parse(req.url);
	var params = query.parse(req_url.query, "&");
	console.log(params);
	//db.run("UPDATE NAMES SET birth_year = ?, death_year = ?, primary_profession = ? WHERE nconst = ?", [params.birth, params.death, params.prof, params.nconst]);
	var inputData = [params.birth, params.death, params.prof, params.nconst];

db.run("UPDATE NAMES SET birth_year=?, death_year=?, primary_profession = ? WHERE nconst =?",inputData,function(err,rows){
	if(err){
		console.log(err);
	}
	else {
		console.log("success");
	}
});
});//app.post(nameupdate)

app.post('/titleupdate', (req, res) => {
	console.log("In POST ");
	var req_url = url.parse(req.url);
	var params = query.parse(req_url.query, "&");
	console.log(params);
	//db.run("UPDATE NAMES SET birth_year = ?, death_year = ?, primary_profession = ? WHERE nconst = ?", [params.birth, params.death, params.prof, params.nconst]);
	var inputData = [params.type, params.genre, params.tconst];

db.run("UPDATE TITLES SET title_type=?, genres=? WHERE tconst =?",inputData,function(err,rows){
	if(err){
		console.log(err);
	}
	else {
		console.log("success");
	}
});
});//app.post(nameupdate)


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
