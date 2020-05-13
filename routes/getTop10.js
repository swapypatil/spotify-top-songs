
var request = require('request');
const SpotifyWebApi = require("spotify-web-api-node");
var querystring = require('querystring');


var CLIENT_ID = '3758be4b28004e4fa232552edd6dd265';
var CLIENT_SECRET = '406a52a82f1147d79079625a0354e38e';
var REDIRECT_URI =  'http://localhost:8888/callback'
var myToken = '';

const spotifyApi = new SpotifyWebApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI
  });

exports.getTop10 = function(req, res){

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
        var artistId = '';

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
        
        request.get(options, function(error, response, body) {

          /*
            Check for artist name, if not available then raise errorPage
          */
          if(body.artists.items[0] == undefined){
            res.render('public/errorPage.ejs',{
              error:'Artist not found.'
            });
            return;
          }

          artistId = body.artists.items[0].id;
          
          /*
            Get Top 10 tracks of Artist based on Popularity from Artist ID
          */
          spotifyApi.getArtistTopTracks(artistId, 'IN').then(
            function(data) {
              var song10 = new Array();
              var cnt = 1;
              for(x=0; x<data.body.tracks.length; x++){
                song10[x] = new Array(3);
                //console.log(cnt + ' Song: ' + data.body.tracks[x].name.toString());
                song10[x][0] = cnt;
                song10[x][1] = data.body.tracks[x].name.toString();
                song10[x][2] = 'https://open.spotify.com/track/' + data.body.tracks[x].uri.toString().replace('spotify:track:', '');
                cnt++;
              }
              //console.log(song10)

              /*
                Send response with song10 array object
              */
              res.render('public/displayTop10.ejs',{
                songs:song10,
                artist:artistName
              });
            },
            function(err) {
              console.error(err);
            }
          );
        });
      }
    });

}