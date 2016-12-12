const EventEmitter = require('events');
const Database = require('./database');
const RotatingProxy = require('./rotating_proxy');

class RotatingProxyManager extends EventEmitter {
    constructor(proxyArr, dbPath, newInstance = false) {
        super();
        this.nextProxyReturned = true;
        this.proxyArr = proxyArr;
        this.database = new Database(dbPath+'/sqlite.db', newInstance);
        let addProxyPromises = [];
        for (let i = 0; i < proxyArr.length; i++) {
            let proxy = proxyArr[i];
            addProxyPromises.push(this.database.addProxy(proxy.toString(), proxy.waitMin, proxy.waitMax));
        }
        Promise.all(addProxyPromises).then(() => {
            this.emit('ready');
        }).catch((err) => {
            throw new Error('Error adding proxy to database: ' + err);
        });
    }

    nextProxy(callback, skipWait = false) {
        if (this.proxyArr.length == 0) {
            throw new Error('No more proxies to use.');
        }
        if (!this.nextProxyReturned) {
            setTimeout(() => {
                this.nextProxy(callback, skipWait);
            }, 0);
            return;
        }
        this.nextProxyReturned = false;
        this.database.nextProxy((err, dbProxy) => {
            if (err) {
                callback(err);
                return;
            }
            let proxy = new RotatingProxy(dbProxy.proxy, dbProxy.min_wait, dbProxy.max_wait, dbProxy.updated_at);
            let timeToWait = proxy.timeToWait;
            if (skipWait || dbProxy.num_uses == 0) {
                timeToWait = 0;
            }
            setTimeout(() => {
                this.nextProxyReturned = true;
                callback(null, proxy);
            }, timeToWait);
        });
    }

    randomProxy(callback, skipWait = false) {
        if (this.proxyArr.length == 0) {
            throw new Error('No more proxies to use.');
        }
        if (!this.nextProxyReturned) {
            setTimeout(() => {
                this.randomProxy(callback, skipWait);
            }, 0);
            return;
        }
        this.nextProxyReturned = false;
        this.database.getProxies((err, proxies) => {
            if (err) {
                callback(err);
                return;
            }
            let proxyIndex = Math.floor(Math.random() * (this.proxyArr.length));
            let dbProxy = proxies[proxyIndex];
            let proxy = new RotatingProxy(dbProxy.proxy, dbProxy.min_wait, dbProxy.max_wait, dbProxy.updated_at);
            let timeToWait = proxy.timeToWait;
            if (skipWait || dbProxy.num_uses == 0) {
                timeToWait = 0;
            }
            this.database.incrementProxy(dbProxy.id, () => {
                setTimeout(() => {
                    this.nextProxyReturned = true;
                    callback(null, proxy);
                }, timeToWait);
            });
        });
    }

    blockProxy(proxy, blockUntil, callback) {
        this.database.blockProxy(proxy, blockUntil, callback);
    }

    getProxies(callback) {
        let proxies = [];
        this.database.getProxies((err, dbProxies) => {
            if (err) {
                callback(err);
                return;
            }
            for (let i = 0; i < dbProxies.length; i++) {
                let dbProxy = dbProxies[i];
                proxies.push(new RotatingProxy(dbProxy.proxy, dbProxy.min_wait, dbProxy.max_wait, dbProxy.updated_at));
            }
            callback(null, proxies);
        });
    }
}

module.exports = RotatingProxyManager;