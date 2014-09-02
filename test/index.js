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

      it('assigns externalAccount and internalAccount ', function() {
        assert.equal(wallet.externalAccount.toBase58(), fixtures.externalAccount)
        assert.equal(wallet.internalAccount.toBase58(), fixtures.internalAccount)
      })

      it('assigns addressIndex and changeAddressIndex', function() {
        assert.equal(wallet.addressIndex, 5)
        assert.equal(wallet.changeAddressIndex, 18)
      })

      it('assigns networkName', function() {
        assert.equal(wallet.networkName, 'testnet')
      })
    })
  })

  describe('serialization & deserialization', function() {
    it('works', function() {
      var parsed = Wallet.deserialize(wallet.serialize())

      assert.equal(parsed.txGraph.heads.length, wallet.txGraph.heads.length)
      assert.equal(parsed.txGraph.heads[0].id, wallet.txGraph.heads[0].id)
      assert.equal(parsed.balance, wallet.balance)
      assert.equal(parsed.externalAccount.toBase58(), wallet.externalAccount.toBase58())
      assert.equal(parsed.internalAccount.toBase58(), wallet.internalAccount.toBase58())
      assert.equal(parsed.addressIndex, wallet.addressIndex)
      assert.equal(parsed.changeAddressIndex, wallet.changeAddressIndex)
      assert.equal(parsed.networkName, wallet.networkName)
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
