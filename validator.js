var assert = require('assert')
var bitcoin = require('bitcoinjs-lib')

function preCreateTx(to, value, network) {
  var address = bitcoin.Address.fromBase58Check(to)
  assert(address.version === network.pubKeyHash || address.version === network.scriptHash, 'Invalid address version')
  assert(value > network.dustThreshold, value + ' must be above dust threshold (' + network.dustThreshold + ' Satoshis)')
}

function postCreateTx(has, needed) {
  assert(has >= needed, 'Not enough funds (incl. fee): ' + has + ' < ' + needed)
}

module.exports = {
  preCreateTx: preCreateTx,
  postCreateTx: postCreateTx
}
