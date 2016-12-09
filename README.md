# node-rotating-proxy-manager
Rotating Proxy Manager module for Node.js

This module was written in an ES6 environment and uses SQLite to store proxy usage info so you can use this across multiple scripts with the same database file.

    const RotatingProxyManager = require('rotating-proxy-manager');
    const RotatingProxy = RotatingProxyManager.RotatingProxy;
    
    let proxies = []; // should be an array of RotatingProxy
    
    // or you can use RotatingProxy.buildArray() to build an array of RotatingProxy
    // proxiesStr can be either a path to a file or a multi-line string of proxies
    let proxiesStr = "123.123.123:8080\n123.123.123:8081";
    proxies = RotatingProxy.buildArray(proxiesStr, 1, 3); // wait 1-3 seconds before re-using proxy
    
    let proxyManager = new RotatingProxyManager(proxies, __dirname, true); // set true to recreate proxy sqlite file
    proxyManager.on('ready', () => {
        proxyManager.nextProxy(function(err, proxy) {
            if (err) return console.log(err);
            // proxy will be the next proxy in the rotation
            console.log(proxy); // 123.123.123:8080
        });
        proxyManager.nextProxy(function(err, proxy) {
            // you don't need to call this function nested or as a promise -
            // it will wait for any previous nextProxy() calls to complete first
            if (err) return console.log(err);
            console.log(proxy); // 123.123.123:8081
        });
    });