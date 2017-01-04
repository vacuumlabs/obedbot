# obedbot

Because ordering lunches is just way too hard

## How to set it up

You need a working installation of [Node.js](https://nodejs.org/en/), preferably in version 6.9.2

Copy `.env.template` into `.env` and fill it in with your information.
`OBEDBOT_CHANNEL_ID` is the id of the channel which the bot should be monitoring.
`OBEDBOT_DEV` disables some messages, so that development does not bother users.

```
git clone https://github.cm/kubik369/obedbot.git
cd obedbot && npm install
cp obedbot.template.db obedbot.db
npm run build
npm start
```
