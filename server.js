const config = require('./config');
const runServer = require(config.dev ? './src/server' : './build/server').runServer;

runServer();
