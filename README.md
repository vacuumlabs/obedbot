# obedbot

Because ordering lunches is just way too hard

## How to set it up

You need a working installation of [Node.js](https://nodejs.org/en/), preferably in version 6.x.x

```
mkdir obedbot && cd obedbot
git clone https://github.cm/kubik369/obedbot.git
npm install
```

Now it is time to fill in your config.js file.
Rename the `config.js.template` file to `config.js`
Thengo to [slack page for creating a new bot](https://my.slack.com/services/new/bot),
create a new bot, take his access token and put it into your config.js file in place of `token` field.
Similarly, supply your `channelId`, which is the ID of the channel you want the bot to monitor and send messages to
and last, but not least, fill in the ID of your bot. Both of these IDs can be found [HERE](https://api.slack.com/methods/channels.list)

## Usage
```
cd obedbot
node server.js
```
