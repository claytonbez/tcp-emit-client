# tcp-emit-client
#### v0.0.2a ~ Seriously just mushed this together, still needs proper testing.

_This module works in conjunction with tcp-emit-server.js_

Inspired by the ease of application of Socket.io. This is an event emitter based tcp client manager built using the net module native to NodeJS.Management of the connections and reconnections are taken care of in the module.
##### Extra Features
`Built into the server and client module is the ability to send and receive files using the .fileSend() method. This is a controlled buffer over TCP/IP read and write using only the 'fs' modules read and write streams.`
## Installation
`npm install tcp-emit-client -save`
## Getting Started
##### Here is a tcp-emit-client sample to connect to the server code below.
`npm install tcp-emit-client`

```javascript
var tcpclient = require('tcp-emit-client');
var socket = new tcpclient('127.0.0.1',3000);

socket.on('connect',function(){
    console.log('connected to server');
    socket.emit("register","myudername","mypassword");
});
socket.on('data',function(buffer){
	//use this method is you purely want to read data received on the tcp socket.
    var data = buffer.toString();
    console.log(`RAW SOCKET DATA: ${data}`);
});
socket.on('register-done',function(){
    console.log("This client has been registered");
    socket.close(); //closes the tcp connection to the server and destroyed all socket objects
});
socket.on('disconnect',function(){
    console.log('Disconnected From Server');
});
socket.on('reconnect',function(){
    console.log('Reconnecting to Server');
});
socket.on('err',function(err){
    console.log(err);
});
```
##### Here is a quick server example.
```javascript
var tcpserver = require('tcp-emit-server');
var server = new tcpserver('127.0.0.1',3000);

server.on('connection',function(socket){

    console.log(`Socket ${socket.ipaddress}:${socket.ipport} connected`);
    //you can create any listener you like, ie. 'register'
    socket.on('register',function(username,password){ 
    	console.log(`Registering ${username},${password}`);
        socket.emit('register-done');
    });
    //here is native events that emit on the socket object
    socket.on('data',function(buffer){
    	var data = buffer.toString();
    	console.log(`RAW SOCKET DATA: ${data}`);
    });
    socket.on('disconnect',function(){
    	console.log(`Socket ${socket.ipaddress}:${socket.ipport} DISCONNECTED`);
    });
    socket.on('err',function(err){
    	console.log(err); 
        //when sockets don't close properly, this event will be emitted along side the disconnect event.
	});
    
});

```


# Basic Client Methods

### - Create TCP Client Object
#### `new tcpclient(server_ip_address,port_to_connect_on);`

```javascript
var tcpclient = require('tcp-emit-client');
var socket = new tcpclient('127.0.0.1',3000);
```
### - Destroy TCP Client Object
#### `socket.destroy();`
Destroying the socket instance also removes all listeners attached to the socket.
```javascript
var tcpclient = require('tcp-emit-client');
var socket = new tcpclient('127.0.0.1',3000);
socket.destoy();
// As if the object was never there...
```
### - Connect Event
#### `socketObject.on('connect',function(){});`

```javascript
var tcpclient = require('tcp-emit-client');
var socket = new tcpclient('127.0.0.1',3000);

socket.on('connect',function(socket){
    //This event gets triggered once you have made a successfull connection to the server
});
```
### - Disconnect Event
#### `socketObject.on('disconnect',function(){});`

```javascript
socket.on('disconnect',function(socket){
    //Triggers when connection to the server has been closed or lost
});
```
### - Reconnect Event
#### `socketObject.on('reconnect',function(){});`

```javascript
socket.on('reconnect',function(socket){
    //Triggers when the module tries to reconnect after a connection to the server was closed. 
});
```
### - Emit to Server
#### `socketObject.emit('yourEvent',dataObj,str,integer);`

```javascript
socket.emit('yourEvent',obj) ;
// you can emit strings, JSON objects or Integers
```
### - Setup Event Listeners
#### `socket.on('yourEvent',function(data1,data2,data3){});`
You may use any event name of your choice and when the server emits data on that event,
all code inside the socket function will be executed.
```javascript
socket.on('anyNameEvent',function(dataObject){
	console.log(`Received:${JSON.stringify(dataObject)}`);
});
```
#### File Transfer Methods
	socket.fileSend('path/to/file.txt');
		- Emits on the 'file' event on the client side. Starts and manages transmission of files between server and client.
		- Both modules uses the same method
	socket.on('getfile',function(filename){});
		- Emits on the 'getfile' event on the client side. Starts and manages transmission of files between server and client.
		- Both modules uses the same method
	
    **Still a work in progress.
Here is an Example of Server sending files to a client. Same methods are available for send and receive on the server and client.
```javascript
//SERVER SCRIPT
var tcp = require('tcp-emit-server');
var server = new tcp('127.0.0.1',3000);

server.on('connection',function(socket){

	socket.on('myfileRequestEvent', function (filename) {
        console.log("file requested:", filename);
        socket.sendFile("relative/path/to/file/"+filename);
    });
    
});

//CLIENT SCRIPT
var tcpclient = require('tcp-emit-client');
var socket = new tcpclient('127.0.0.1',3000);

socket.on('connect', function () {
	//Requests The File On Connection to Server
	socket.emit('myFileRequestEvent','sampleFile.txt');
});
socket.on('file', function (file) {
	//the object passed via the file event contains a file.filename and file.size property you can access.
    var fn = file.filename;
    var size = file.size;
    var f = fs.createWriteStream('relative/path/to/save/directory/' + fn);
    file.on('data', function (buffer) {
    	//as data arrives for this file object, a buffer will be passed in on the 'data' event.
    	f.write(buffer);
    });
    file.on('end', function () {
    	//when data has been 
    	console.log('File Received');
    });
});    
```
