const presets = [
  [
    '@babel/env',
    {
      targets: {
        node: '10',
      },
    },
  ],
]

const plugins = [['@babel/plugin-proposal-object-rest-spread']]

module.exports = { presets, plugins }
