var assert = require('assert')
var Wallet = require('../')
var fixtures = require('./fixtures')
var TxGraph = require('bitcoin-tx-graph')
var uniqueify = require('uniqueify')

describe('Common Blockchain Wallet', function() {
  this.timeout(40000)
  var wallet

  before(function(done) {
    wallet = new Wallet(fixtures.externalAccount, fixtures.internalAccount, 'testnet', done)
  })

  describe('constructor', function() {
    it('returns error when externalAccount and internalAccount are missing', function(done) {
      new Wallet(null, null, 'testnet', function(err) {
        assert(err)
        done()
      })
    })

    describe('wallet properties', function() {
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

  describe('getTransactionHistory', function() {
    it('returns the expected transactions', function() {
      var txIds = wallet.getTransactionHistory().map(function(tx) {
        return tx.getId()
      })

      var expectedIds = fixtures.txs.map(function(tx) {
        return tx.id
      })

      assert.deepEqual(txIds.sort(), expectedIds.sort())
    })
  })
})
