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

    describe('wallet properties', function() {
      before(function(done) {
        wallet = new Wallet(fixtures.externalAccount, fixtures.internalAccount, 'testnet', done)
      })

      it('initializes a txGraph', function() {
        assert(wallet.txGraph)
        assert.equal(wallet.txGraph.heads.length, 1)
        assert.equal(wallet.txGraph.heads[0].id, fixtures.cashingTxId)
      })

      it('assigns balance', function() {
        assert.equal(wallet.balance, 0)
      })

      it('assigns addressIndex and changeAddressIndex', function() {
        assert.equal(wallet.addressIndex, 5)
        assert.equal(wallet.changeAddressIndex, 18)
      })
    })
  })
})
