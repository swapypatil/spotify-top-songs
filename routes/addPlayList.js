
var request = require('request');
const SpotifyWebApi = require("spotify-web-api-node");

var CLIENT_ID = '3758be4b28004e4fa232552edd6dd265';
var CLIENT_SECRET = '406a52a82f1147d79079625a0354e38e';
var REDIRECT_URI =  'http://localhost:8888/callback'
var myToken = '';

const spotifyApi = new SpotifyWebApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI
  });

exports.addPlaylist = function(req, res){
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

            spotifyApi.createPlaylist('My Cool Playlist 2406', { 'public' : false })
            .then(function(data) {
                console.log('Created playlist!');
            }, function(err) {
                console.log('Something went wrong!', err);
            });

        }
    });

}