const config = require('./config');
const utils = require('./build/utils');

(async () => {
  const presto = await utils.getMenu(config.menuLinks.presto, utils.parseTodaysPrestoMenu);
  const veglife = await utils.getMenu(config.menuLinks.veglife, utils.parseTodaysVeglifeMenu);
  const mizza = await utils.getMenu(config.menuLinks.mizza, utils.parseTodaysMizzaMenu);

  console.log(presto);
  console.log(veglife);
  console.log(mizza);
})();
