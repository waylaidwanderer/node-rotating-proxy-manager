const RotatingProxyManager = require('./rotating_proxy_manager');
const RotatingProxy = require('./rotating_proxy');

RotatingProxyManager.RotatingProxy = RotatingProxy;

module.exports = RotatingProxyManager;