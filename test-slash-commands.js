const config = require('./config');
const utils = require('./build/utils');

(async () => {
  const presto = await utils.getMenu(config.menuLinks.presto, utils.parseTodaysPrestoMenu);
  const veglife = await utils.getMenu(config.menuLinks.veglife, utils.parseTodaysVeglifeMenu);
  const hamka = await utils.getMenu(config.menuLinks.hamka, utils.parseTodaysHamkaMenu);

  console.log(veglife);
  console.log(presto);
  console.log(hamka);
})();
