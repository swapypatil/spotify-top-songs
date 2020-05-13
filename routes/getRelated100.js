
const SpotifyWebApi = require("spotify-web-api-node");
var request = require('request');
const pg = require('pg');
var querystring = require('querystring');

var CLIENT_ID = '3758be4b28004e4fa232552edd6dd265';
var CLIENT_SECRET = '406a52a82f1147d79079625a0354e38e';
var REDIRECT_URI =  'http://localhost:8888/callback'
var myToken = '';
const connectionString = 'postgres://postgres:root@localhost:5432/spotify'

const spotifyApi = new SpotifyWebApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI
  });

exports.getRelated100 = function(req, res){
    
    /*
      Setup database connection
    */
    /*var con = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "spotifyTop10"
    });*/

    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: true
    });
    client.connect();

    /*
      Authorization query for getting API access token, method used is client_credentials
    */
    var code = req.query.code || null;
    var scope = 'user-read-private user-read-email';
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        grant_type: 'client_credentials'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
      },
      json: true
    };
  
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
  
        /*
          Read and set access token from response from api
        */
        myToken = body.access_token;
        console.log('Token: ', myToken);
        spotifyApi.setAccessToken(myToken);
  
        /*
          Get artist name from the client request
        */
        var artistName = req.query['artist'];
        console.log('Artist : ' + artistName);
        var artistPopularity, artistId = '';
  
        /*
          Get Artist ID from its name
        */
        var options = {
          url: 'https://api.spotify.com/v1/search?q=' + querystring.escape(artistName) + '&type=artist',
          headers: {
            'Authorization': 'Bearer ' + myToken
          },
          json: true
        };
        
        request.get(options, async function fun (error, response, body) {
          
          /*
            Check for artist name, if not available then raise errorPage
          */
          if(body.artists.items[0] == undefined){
            res.render('public/errorPage.ejs',{
              error:'Artist not found.'
            });
            return;
          }
  
          /*
            Set Current Artist data
          */
          artistId = body.artists.items[0].id;
          artistPopularity = body.artists.items[0].popularity;
  
          /*
            Truncate Previously available data from table
          */
          var sql = "TRUNCATE TABLE tracks";
          
          client.query(sql)
          .then(res => {
            console.log("Table Truncated");
          });

      
          /*
            Get Top 10 tracks of current Artist based on Popularity from Artist ID
          */
          var song100 = new Array();
          var cnt = 1;
          await spotifyApi.getArtistTopTracks(artistId, 'IN').then(
            function(data) {
              for(x=0; x<data.body.tracks.length; x++){
                song100[x] = new Array(3);
                //console.log(cnt + ' Song: ' + data.body.tracks[x].name.toString());
                song100[x][0] = cnt;
                song100[x][1] = data.body.tracks[x].name.toString();
                song100[x][2] = data.body.tracks[x].uri.toString().replace('spotify:track:', '');
                cnt++;
              }
              //console.log(song100);
  
              /*
                Store the songs into the database
              */
              
              for(var i=0; i<10;i++){
                var sql = {
                  text: "INSERT INTO tracks (id, name, uri) VALUES ($1, $2, $3)",
                  values: song100[i]
                };
                client.query(sql, function (err, result) {
                  if (err) throw err;
                  //console.log("1 records inserted");
                });     
              }  
            },
            function(err) {
              console.error(err);
            }
          );
  
  
          /* 
            Get Top 9 related artists and store their data  
          */
          await spotifyApi.getArtistRelatedArtists(artistId)
          .then(async function fun2(data) {
            var relatedArtists = new Array(20);
            
            for(i=0; i<data.body.artists.length; i++){
              relatedArtists[i] = new Array(3);
              //console.log('\n', parseInt(i+1), data.body.artists[i].name, data.body.artists[i].popularity, data.body.artists[i].uri.toString().replace('spotify:artist:', ''));
              relatedArtists[i][0] = data.body.artists[i].name.toString();
              relatedArtists[i][1] = data.body.artists[i].popularity;
              relatedArtists[i][2] = data.body.artists[i].uri.toString().replace('spotify:artist:', '');
            }
            relatedArtists.sort(function(a,b){
              return a[1] - b[1];
            });
            relatedArtists = relatedArtists.slice(11,20).reverse();
            console.log(relatedArtists);
            
            var str = '';
            
            var done = false;
            for(i=0; i<relatedArtists.length; i++){
              //console.log('\nArtist : ' + relatedArtists[i][0].toString());
  
              /*
              Get Top 10 tracks of 9 related Artist based on Popularity from Artist ID
              */
              await spotifyApi.getArtistTopTracks(relatedArtists[i][2], 'IN').then(
                function(data) {
                  for(x=0; x<data.body.tracks.length; x++){
                    song100[x] = new Array(3);
                    //console.log(cnt + ' Song: ' + data.body.tracks[x].name.toString());
                    song100[x][0] = cnt;
                    song100[x][1] = data.body.tracks[x].name.toString();
                    song100[x][2] = data.body.tracks[x].uri.toString().replace('spotify:track:', '');
                    cnt++;
                  }
                  //console.log(song100);
  
                  /*
                    Store the songs into the database
                  */

                  for(var i=0; i<10;i++){
                    var sql = {
                      text: "INSERT INTO tracks (id, name, uri) VALUES ($1, $2, $3)",
                      values: song100[i]
                    };
                    client.query(sql, function (err, result) {
                      if (err) throw err;
                      //console.log("1 records inserted");
                    });     
                  }       
                },
                function(err) {
                  console.error(err);
                }
              );
            }
  
            var send100 = new Array();
            var sql = "SELECT * from tracks";
            client.query(sql, function(err, result){
              if (err) throw err;
              console.log(result.length);
              console.log(result.rows[0].name);
              for(var i=0;i<result.rows.length;i++){
                send100[i] = new Array(3);
                send100[i][0] = result.rows[i].id;
                send100[i][1] = result.rows[i].name;
                send100[i][2] = result.rows[i].uri;
              }
              //console.log(send100);
              res.render('public/displayRelated100.ejs',{
                songs:send100,
                artists:relatedArtists,
                artist:artistName
              });
            });
  
          }, function(err) {
            console.error(err);
          });
        });
           
      }
    });
      
  }