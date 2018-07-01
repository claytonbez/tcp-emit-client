var net = require('net');
var util = require('util');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var { Writable } = require('stream');
var { Readable } = require('stream');
var ec = String.fromCharCode(13);

var file = function () { }
util.inherits(file, EventEmitter);
var stream = function (options) {
    if (!(this instanceof stream))
        return new stream(options);
    Writable.call(this, options);
}
util.inherits(stream, EventEmitter);

var mainSocket, socket;

var initSocket = function (addr, port) {
    var self = this;
    self.oldEmit = self.emit; //going out
    self.emit = function (evt, data) { // incoming from implementation .on events inside initSocket
        self.oldEmit('msg', evt, data);
    }

    socket = new net.Socket();
    socket = net.connect(port, addr, function () { self.oldEmit('connect'); });

    socket.on('data', function (buffer) { // forward buffer to mainProcess
        self.oldEmit('data', buffer);
    });
    socket.on('close', function () {// forward close to mainProcess
        self.oldEmit('close');
    });
    socket.on('error', function (err) { // forward error to mainProcess
        self.oldEmit('error', err);
    });

    self.on('msg', function (event, data) { // listen for msg events on initSocket and write json protocol to the raw socket
        var obj = { e: event, d: data };
        var strConst = JSON.stringify(obj);
        socket.write(strConst + ec);
    });
    self.sendFile = function (fn, fp, callback) {
        fs.stat(fp, function (err, stats) {
            if (!err) {
                var obj = { f: fn, fs: stats.size, s: 1 };
                socket.write(JSON.stringify(obj) + ec);
                var rs = fs.createReadStream(fp);
                rs.on('data', function (chunk) {
                    socket.write(JSON.stringify({ f: obj.f, b: chunk }) + ec);
                });
                rs.on('error', function (err) {
                    callback(false, err);
                });
                rs.on('end', function () {
                    (function () {
                        var o = obj;
                        setTimeout(function () {
                            socket.write(JSON.stringify({ f: o.f, c: 1 }) + ec);
                            callback(true);
                        }, 500);
                    })();
                });
            } else {
                socket.oldEmit('error', err);
            }
        });
    }
}
util.inherits(initSocket, EventEmitter);
var setDelete = 0;
var rawbuffer = '';
var fileHolder;
var main = function (addr, port) {
    var self = this;
    self.oldEmit = self.emit;
    self.emit = function (evt, data) { // forward main process event to initSocket
        mainSocket.emit(evt, data, );
    }
    self.destroy = function () {
        self.oldEmit('destroy');
        setDelete = 1;
        socket.destroy();
        delete (mainSocket);
    }
    self.sendFile = function (fn, fp, callback) {
        mainSocket.sendFile(fn, fp, function (done, err) {
            if (done) {
                callback(true);
            }
            else {
                callback(false, err);
            }

        });
    }
    var mainSocketFunc = function (addr, port) {
        if (mainSocket) { delete (mainSocket); }
        mainSocket = new initSocket(addr, port);
        mainSocket.on('connect', function () {

            self.oldEmit('connect');
        });
        mainSocket.on('data', function (buffer) {
            var dta = buffer.toString();
            var lc = dta[dta.length - 1];
            rawbuffer = rawbuffer + dta;
            if (lc == String.fromCharCode(13)) {
                var data = rawbuffer;
                rawbuffer = '';
                data = data.substr(0, data.length - 1);
                try {
                    var obj = JSON.parse(data);
                    if (obj.e) {
                        var evt = obj.e;
                        var sd = obj.d;
                        self.oldEmit(evt, sd);
                    }
                    else {
                        if (obj.f) {
                            if (obj.s) {
                                fileHolder = new file(obj.f);
                                fileHolder.filename = obj.f;
                                fileHolder.size = obj.fs;
                                self.oldEmit('file', fileHolder);
                            }
                            if (obj.b) {
                                var buffer = Buffer.from(obj.b, 'utf8')
                                fileHolder.emit('data', buffer);
                            }
                            if (obj.c) {
                                fileHolder.emit('end');
                                fileholder = null;
                            }
                        }
                    }
                } catch (err) {
                    console.log(err)
                    self.oldEmit('error', err);
                }
            }
        });
        mainSocket.on('close', function () {
            self.oldEmit('disconnect');
            if (!setDelete) {
                (function () {
                    var ad = addr;
                    var pr = port;
                    setTimeout(function () {
                        self.oldEmit('reconnect')
                        mainSocketFunc(addr, port);
                    }, 3000);
                })();
            }

        });
        mainSocket.on('error', function (err) {
            self.oldEmit('err', err);
        });
    }
    mainSocketFunc(addr, port);
}
util.inherits(main, EventEmitter);
module.exports = main; 