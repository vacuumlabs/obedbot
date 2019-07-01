var readFileSync = require('fs').readFileSync

module.exports = {
  help: readFileSync('./messages/help.txt').toString(),
  unknownOrder: readFileSync('./messages/unknownOrder.txt').toString(),
  privateIsDeprecated: readFileSync(
    './messages/privateIsDeprecated.txt',
  ).toString(),
}
