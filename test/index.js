var assert = require('assert')
var Wallet = require('../')
var fixtures = require('./fixtures')
var TxGraph = require('bitcoin-tx-graph')

describe('Common Blockchain Wallet', function() {
  this.timeout(30000)
  var wallet

  describe('constructor', function() {
    it('returns error when externalAccount and internalAccount are missing', function(done) {
      new Wallet(null, null, 'testnet', new TxGraph(), function(err) {
        assert(err)
        done()
      })
    })

    it('does not create a new txGraph when one is passed in', function(done) {
      var graph = new TxGraph()
      new Wallet(fixtures.externalAccount, fixtures.internalAccount, 'testnet', graph, function(err, wallet) {
        assert.ifError(err)
        assert.equal(wallet.txGraph, graph)
        done()
      })
    })

    it('initializes a txGraph when it is not passed in', function(done) {
      wallet = new Wallet(fixtures.externalAccount, fixtures.internalAccount, 'testnet', function(err, wallet) {
        assert.ifError(err)
        assert(wallet.txGraph)
        done()
      })
    })
  })
})
