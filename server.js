const config = require('./config')

let serverScript
if (config.dev) {
  require('@babel/register')
  serverScript = './src/server'
} else {
  serverScript = './build/server'
}

const { runServer } = require(serverScript)
runServer()
