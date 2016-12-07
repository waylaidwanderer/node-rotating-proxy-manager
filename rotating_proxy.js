"use strict";
const fs = require('fs');

class RotatingProxy {
    constructor(proxy, waitMin = 0, waitMax = 0, lastUseTimestamp = 0) {
        this.ip = null;
        this.port = null;
        this.username = null;
        this.password = null;
        this.waitMin = waitMin;
        this.waitMax = waitMax;
        this.lastUseTimestamp = lastUseTimestamp;
        let split = proxy.split('@');
        if (split.length == 2) {
            this.parseAuthString(split[0]);
            this.parseProxyString(split[1]);
        } else if (split.length == 1) {
            this.parseProxyString(split[0]);
        } else {
            throw new Error("Malformed proxy string.");
        }
    }

    static buildArray(path, waitMin = 0, waitMax = 0, lastUseTimestamp = 0) {
        let arr = [];
        let lines = '';
        try {
            lines = fs.accessSync(path, fs.F_OK);
        } catch (err) {
            lines = path;
        }
        lines = lines.split(/\r\n|\r|\n/g);
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if (line.trim() == '') continue;
            arr.push(new RotatingProxy(line, waitMin, waitMax, lastUseTimestamp));
        }
        return arr;
    }

    parseAuthString(str) {
        str = str.split(':');
        if (str.length == 2) {
            this.username = str[0];
            this.password = str[1];
        } else {
            throw new Error("Malformed proxy string.");
        }
    }

    parseProxyString(str) {
        str = str.split(':');
        if (str.length == 2) {
            this.ip = str[0];
            this.port = str[1];
        } else {
            throw new Error("Malformed proxy string.");
        }
    }

    toString() {
        let output = '';
        if (this.username) {
            output += this.username + ':';
            if (this.password) {
                output += this.password;
            }
            output += '@';
        }
        output += this.ip + ':' + this.port;
        return output;
    }

    setWaitInterval(minSeconds, maxSeconds = 0) {
        if (maxSeconds > minSeconds) {
            this.waitMax = maxSeconds;
        }
        this.waitMin = minSeconds;
    }

    get waitInterval() {
        if (this.waitMax > this.waitMin) {
            let min = Math.ceil(this.waitMin * 1000);
            let max = Math.floor(this.waitMax * 1000);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        return Math.round(this.waitMin * 1000);
    }

    get timeSinceLastUse() {
        return Date.now() - this.lastUseTimestamp;
    }

    get timeToWait() {
        let timeToWait = this.waitInterval - this.timeSinceLastUse;
        return timeToWait < 0 ? 0 : timeToWait;
    }
}

module.exports = RotatingProxy;