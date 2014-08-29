var assert = require('assert')
var Wallet = require('../')
var fixtures = require('./fixtures')
var TxGraph = require('bitcoin-tx-graph')

describe('Common Blockchain Wallet', function() {
  this.timeout(40000)
  var wallet

  describe('constructor', function() {
    it('returns error when externalAccount and internalAccount are missing', function(done) {
      new Wallet(null, null, 'testnet', function(err) {
        assert(err)
        done()
      })
    })

    it('initializes a txGraph, assigns balance, addressIndex and changeAddressIndex', function(done) {
      wallet = new Wallet(fixtures.externalAccount, fixtures.internalAccount, 'testnet', function(err, wallet) {
        assert.ifError(err)
        assert(wallet.txGraph)
        assert.equal(wallet.balance, 0)
        assert.equal(wallet.addressIndex, 5)
        assert.equal(wallet.changeAddressIndex, 18)
        done()
      })
    })
  })
})
