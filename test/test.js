"use strict";
const assert = require('assert');
const fs = require('fs');
const RotatingProxyManager = require('../index');
const RotatingProxy = RotatingProxyManager.RotatingProxy;

describe('RotatingProxyManager', function() {
    const self = this;
    before(function() {
        self.proxies = [];
        let rotatingProxy = new RotatingProxy('127.0.0.1:80');
        self.proxies.push(rotatingProxy);
        rotatingProxy = new RotatingProxy('127.0.0.2:80');
        rotatingProxy.setWaitInterval(5);
        self.proxies.push(rotatingProxy);
        rotatingProxy = new RotatingProxy('127.0.0.3:81');
        rotatingProxy.setWaitInterval(2, 4);
        self.proxies.push(rotatingProxy);
    });
    afterEach(function(done) {
        self.proxyManager.database.db.close(() => {
            done();
        });
    });
    after(function(done) {
        if (!self.proxyManager) return done();
        fs.unlinkSync(__dirname + '/sqlite.db');
        done();
    });
    describe('#getProxies()', function() {
        it('length should equal number of proxies inserted', function(done) {
            createProxyManager(self.proxies, true).then(proxyManager => {
                self.proxyManager = proxyManager;
                self.proxyManager.getProxies((err, proxies) => {
                    if (err) done(err);
                    assert.equal(proxies.length, 3);
                    done();
                });
            }).catch(err => {
                done(err);
            });
        });
    });
    describe('#nextProxy()', function() {
        it('should return correct proxy', function(done) {
            createProxyManager(self.proxies, true).then(proxyManager => {
                self.proxyManager = proxyManager;
                return nextProxy(self.proxyManager);
            }).then(proxy => {
                assert.equal(proxy.toString(), '127.0.0.1:80');
                return nextProxy(self.proxyManager);
            }).then(proxy => {
                assert.equal(proxy.toString(), '127.0.0.2:80');
                return nextProxy(self.proxyManager);
            }).then(proxy => {
                assert.equal(proxy.toString(), '127.0.0.3:81');
                return nextProxy(self.proxyManager);
            }).then(proxy => {
                assert.equal(proxy.toString(), '127.0.0.1:80');
                done();
            }).catch(err => {
                done(err);
            });
        });
        it('should return correct proxy across multiple RotatingProxyManagers', function(done) {
            createProxyManager(self.proxies, true).then(proxyManager => {
                self.proxyManager = proxyManager;
                return nextProxy(self.proxyManager);
            }).then(proxy => {
                assert.equal(proxy.toString(), '127.0.0.1:80');
                return createProxyManager(self.proxies, false, self.proxyManager);
            }).then(proxyManager => {
                self.proxyManager = proxyManager;
                return nextProxy(self.proxyManager);
            }).then(proxy => {
                assert.equal(proxy.toString(), '127.0.0.2:80');
                return createProxyManager(self.proxies, false, self.proxyManager);
            }).then(proxyManager => {
                self.proxyManager = proxyManager;
                return nextProxy(self.proxyManager);
            }).then(proxy => {
                assert.equal(proxy.toString(), '127.0.0.3:81');
                return createProxyManager(self.proxies, false, self.proxyManager);
            }).then(proxyManager => {
                self.proxyManager = proxyManager;
                return nextProxy(self.proxyManager);
            }).then(proxy => {
                assert.equal(proxy.toString(), '127.0.0.1:80');
                done();
            }).catch(err => {
                done(err);
            });
        });
        it('should not return the first proxy after blocking it', function(done) {
            createProxyManager(self.proxies, true).then(proxyManager => {
                self.proxyManager = proxyManager;
                blockProxy(self.proxyManager, '127.0.0.1:80', Date.now() + 1000).then(() => {
                    return nextProxy(self.proxyManager);
                }).then(proxy => {
                    assert.equal(proxy.toString(), '127.0.0.2:80');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
        it('should return blocked proxy when Date.now() > blockUntil time', function(done) {
            createProxyManager(self.proxies, true).then(proxyManager => {
                self.proxyManager = proxyManager;
                blockProxy(self.proxyManager, '127.0.0.1:80', Date.now() + 1000).then(() => {
                    return new Promise(resolve => setTimeout(resolve, 1100));
                }).then(() => {
                    return nextProxy(self.proxyManager);
                }).then(proxy => {
                    assert.equal(proxy.toString(), '127.0.0.1:80');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
    });
});

function createProxyManager(proxies, newInstance = false, proxyManager = null) {
    return new Promise(resolve => {
        if (proxyManager) {
            proxyManager.database.db.close(() => {
                proxyManager = new RotatingProxyManager(proxies, __dirname, newInstance);
                proxyManager.on('ready', function() {
                    resolve(proxyManager);
                });
            });
        } else {
            proxyManager = new RotatingProxyManager(proxies, __dirname, newInstance);
            proxyManager.on('ready', function() {
                resolve(proxyManager);
            });
        }
    });
}

function nextProxy(proxyManager) {
    return new Promise((resolve, reject) => {
        proxyManager.nextProxy((err, proxy) => {
            if (err) return reject(err);
            resolve(proxy);
        });
    });
}

function blockProxy(proxyManager, proxy, blockUntil) {
    return new Promise((resolve, reject) => {
        proxyManager.blockProxy(proxy, blockUntil, err => {
            if (err) return reject(err);
            resolve();
        });
    });
}