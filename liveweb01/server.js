/*
Certificate is saved at: /etc/letsencrypt/live/yy5262.itp.io/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/yy5262.itp.io/privkey.pem
This certificate expires on 2025-05-11.
*/

var https = require('https');
var fs = require('fs');

var credentials = { 
    key: fs.readFileSync('/etc/letsencrypt/live/yy5262.itp.io/privkey.pem'), 
    cert: fs.readFileSync('/etc/letsencrypt/live/yy5262.itp.io/fullchain.pem') 
};

// Express is a node module for building HTTP servers
var express = require('express');
var app = express();

// Tell Express to look in the "public" folder for any files first
app.use(express.static('public'));

// If the user just goes to the "route" / then run this function
app.get('/', function (req, res) {
  res.send('Hello World!')
});

// Here is the actual HTTP server 
// var http = require('http');
// We pass in the Express object
var httpsServer = https.createServer(credentials, app);
// Listen on port 80
httpsServer.listen(443);

// WebSocket Portion
// WebSockets work with the HTTP server
var io = require('socket.io')(httpsServer);

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on('connection', 
	// We are given a websocket object in our function
	function (socket) {
	
		console.log("We have a new client: " + socket.id);
		
		// When this user emits, client side: socket.emit('otherevent',some data);
		socket.on('chatmessage', function(data) {
			// Data comes in as whatever was sent, including objects
			console.log("Received: 'chatmessage' " + data);
			
			// Send it to all of the clients
			io.sockets.emit('chatmessage', data);
		});
		
		socket.on('disconnect', function() {
			console.log("Client has disconnected " + socket.id);
		});
	}
);