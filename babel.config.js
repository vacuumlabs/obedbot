const presets = [
  [
    '@babel/env',
    {
      targets: {
        node: '12.15',
      },
    },
  ],
]

const plugins = [['@babel/plugin-proposal-object-rest-spread']]

module.exports = { presets, plugins }
