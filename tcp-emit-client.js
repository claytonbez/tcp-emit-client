var util = require('util');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var SocketEmitter = require('events').EventEmitter;
var net = require('net');
var socket;
var brStr = "~!";
var initSocket = function(addr,port){
    var self = this;
    self.oldEmit = self.emit; //going out
    self.emit = function (evt, data, data2, data3) { // .on events inside initSocket
        self.oldEmit('msg', evt, data, data2, data3);
    }
    self.sendFile = function (file) {
        var rs = fs.createReadStream(file);
        socket.write(`^o${brStr}${file}`);
        rs.on('data', function (buffer) {
            var b = buffer.toString('utf8');
            socket.write(`^d${brStr}${file}${brStr}${b}`);
        });
        rs.on('close', function () {
            console.log('file closed');
            setTimeout(function () {
                socket.write(`^c${brStr}${file}`);
            }, 500);
        });
    }

    var socket = new net.Socket();
    socket = net.connect(port, addr, function () {
        self.oldEmit('connect');
    });
    socket.on('data', function (buffer) {
        self.oldEmit('data', buffer);
    });
    socket.on('close', function () {
        self.oldEmit('close');
    });
    socket.on('error', function (err) {
        self.oldEmit('err,', err);
    });
    self.on('msg',function(evt,data,data2,data3){
        var strConst = `${evt}${brStr}`
        try {
            data = JSON.stringify(data);
        } catch (e) { }
        strConst += `${data}`;
        if (data2) {
            try {
                data2 = JSON.stringify(data2);
            } catch (e) { }
            strConst += `${brStr}${data2}`;
        }
        if (data3) {
            try {
                data3 = JSON.stringify(data3);
            } catch (e) { }
            strConst += `${brStr}${data3}`;
        }
        socket.write(strConst);
    });

}
util.inherits(initSocket, SocketEmitter);
var fileHolders = []; 
var file = function (fn) { 
    this.filename = fn;
}
util.inherits(file, EventEmitter);
var main = function(addr,port){
    var self = this;
    self.oldEmit = self.emit;
    self.emit = function (evt, data, data2, data3) { 
        mainSocket.emit(evt, data, data2, data3);
    }
    self.setBreakStr = function (str) {
        brStr = str;
    };
    var mainSocket;
    var mainSocketFunc = function(addr,port){
        if(mainSocket){ delete(mainSocket);}
        mainSocket = new initSocket(addr, port);
        mainSocket.on('connect', function () {
            self.oldEmit('connect');
        });
        mainSocket.on('data', function (buffer) {
            var data = buffer.toString();
            self.oldEmit('data', data);
            var d = data.split(brStr);
            switch(d[0]){
                case "^o":
                    console.log('openfile')
                    var fn = d[1]
                    fileHolders[fn] = new file(fn);
                    self.oldEmit('file', fileHolders[fn]);
                    break;
                case "^d":
                    var fn = d[1]
                    var buffer = Buffer.from(d[2],'utf8')
                    fileHolders[fn].emit('data', buffer);
                    break;
                case "^c":
                    var fn = d[1]
                    fileHolders[fn].emit('end');
                    var i = fileHolders.indexOf(fileHolders[fn]);
                    fileHolders.splice(i,1);
                    break;
                default:
                    if (d.length == 2) {
                        var evt = d[0];
                        var sendData = d[1];
                        try { sendData = JSON.parse(sendData); }
                        catch (e) { }
                        self.oldEmit(evt, sendData);
                    }
                    if (d.length == 3) {
                        var evt = d[0];
                        var sendData = d[1], sendData2 = d[2];
                        try { sendData = JSON.parse(sendData); } catch (e) { }
                        try { sendData2 = JSON.parse(sendData2); } catch (e) { }
                        self.oldEmit(evt, sendData, sendData2);
                    }
                    if (d.length == 4) {
                        var evt = d[0];
                        var sendData = d[1], sendData2 = d[2], sendData3 = d[3];
                        try { sendData = JSON.parse(sendData); } catch (e) { }
                        try { sendData2 = JSON.parse(sendData2); } catch (e) { }
                        try { sendData3 = JSON.parse(sendData3); } catch (e) { }
                        self.oldEmit(evt, sendData, sendData2, sendData3);
                    }

            }
             });
        mainSocket.on('close', function () {
            self.oldEmit('disconnect');
            (function(){
                var ad = addr;
                var pr = port;
                setTimeout(function(){
                    self.oldEmit('reconnect')
                    mainSocketFunc(addr, port);
                },1000);                    
            })();
        });
        mainSocket.on('error', function (err) {
            self.oldEmit('err', err);
        });
    }
    mainSocketFunc(addr,port);
}
util.inherits(main, EventEmitter);
module.exports = main; 