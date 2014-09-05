var assert = require('assert')
var TxGraph = require('bitcoin-tx-graph')
var bitcoin = require('bitcoinjs-lib')
var Transaction = bitcoin.Transaction
var Address = bitcoin.Address
var testnet = bitcoin.networks.testnet
var fixtures = require('./wallet')
var history = require('./history')
var addresses = require('./addresses').addresses
var changeAddresses = require('./addresses').changeAddresses
var Wallet = require('../')

describe('Common Blockchain Wallet', function() {
  describe('network dependent tests', function() {
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
        })

        it('assigns externalAccount and internalAccount ', function() {
          assert.equal(wallet.externalAccount.toBase58(), fixtures.externalAccount)
          assert.equal(wallet.internalAccount.toBase58(), fixtures.internalAccount)
        })

        it('assigns addresses and changeAddresses', function() {
          assert.deepEqual(wallet.addresses, addresses)
          assert.deepEqual(wallet.changeAddresses, changeAddresses)
        })

        it('assigns networkName', function() {
          assert.equal(wallet.networkName, 'testnet')
        })

        it('assigns txMetadata', function() {
          var txIds = wallet.txGraph.getAllNodes().filter(function(n) {
            return n.tx != null
          }).map(function(n) { return n.id })
          assert.deepEqual(Object.keys(wallet.txMetadata).sort(), txIds.sort())

          for(var key in wallet.txMetadata) {
            assert.equal(typeof wallet.txMetadata[key].confirmations, 'number')
          }
        })
      })
    })

    describe('serialization & deserialization', function() {
      it('works', function() {
        var parsed = Wallet.deserialize(wallet.serialize())

        assert.equal(parsed.txGraph.heads.length, wallet.txGraph.heads.length)
        assert.equal(parsed.txGraph.heads[0].id, wallet.txGraph.heads[0].id)
        assert.equal(parsed.externalAccount.toBase58(), wallet.externalAccount.toBase58())
        assert.equal(parsed.internalAccount.toBase58(), wallet.internalAccount.toBase58())
        assert.equal(parsed.addressIndex, wallet.addressIndex)
        assert.equal(parsed.changeAddressIndex, wallet.changeAddressIndex)
        assert.equal(parsed.networkName, wallet.networkName)
        assert.deepEqual(parsed.txMetadata, wallet.txMetadata)
      })
    })
  })

  describe('non-network dependent tests', function() {
    var wallet
    before(function() {
      wallet = Wallet.deserialize(JSON.stringify(fixtures))
    })

    describe('getBalance', function() {
      it('works', function() {
        assert.equal(wallet.getBalance(), 0)
      })
    })

    describe('getNextAddress', function() {
      it('works', function() {
        assert.deepEqual(wallet.getNextAddress(), 'mk9p4BPMSTK5C5zZ3Gf6mWZNtBQyC3RC7K')
      })
    })

    describe('getNextChangeAddress', function() {
      it('works', function() {
        assert.deepEqual(wallet.getNextChangeAddress(), 'mrsMaRK7PNQt1i9sv11Dx8ZCE6aZxDKCyi')
      })
    })

    describe('getPrivateKeyForAddress', function(){
      it('returns the private key for the given address', function(){
        assert.equal(
          wallet.getPrivateKeyForAddress(addresses[1]).toWIF(),
          wallet.externalAccount.derive(1).privKey.toWIF()
        )
        assert.equal(
          wallet.getPrivateKeyForAddress(changeAddresses[0]).toWIF(),
          wallet.internalAccount.derive(0).privKey.toWIF()
        )
      })

      it('raises an error when address is not found', function(){
        assert.throws(function() {
          wallet.getPrivateKeyForAddress(changeAddresses[changeAddresses.length])
        }, /Unknown address. Make sure the address is from the keychain and has been generated./)
      })
    })

    describe('getTransactionHistory', function() {
      var actualHistory
      before(function() {
        actualHistory = wallet.getTransactionHistory()
      })

      it('returns the expected transactions in expected order', function() {
        var txIds = actualHistory.map(function(tx) {
          return tx.getId()
        })

        var expectedIds = history.txs.map(function(tx) {
          return tx.id
        })

        assert.deepEqual(txIds, expectedIds)
      })

      it('returns the transactions with the expected values & fees', function() {
        var metadata = wallet.txMetadata
        var actual = actualHistory.map(function(tx) {
          var id = tx.getId()
          return { id: id, fee: metadata[id].fee, value: metadata[id].value }
        })

        var expected = history.txs.map(function(tx) {
          return { id: tx.id, fee: tx.fee, value: tx.value }
        })

        assert.deepEqual(actual, expected)
      })
    })

    describe('createTx', function() {
      this.timeout(3000)

      var to, value, unspentTxs
      var address1, address2

      before(function(){
        to = 'mh8evwuteapNy7QgSDWeUXTGvFb4mN1qvs'
        value = 500000
        unspentTxs = []

        address1 = wallet.addresses[0]
        address2 = wallet.changeAddresses[0]

        var prevTxs = []

        var pair0 = createTxPair(address1, 400000) // not enough for value
        wallet.processTx(pair0.tx, pair0.prevTx, 0)
        unspentTxs.push(pair0.tx)

        var pair1 = createTxPair(address1, 500000) // not enough for only value
        wallet.processTx(pair1.tx, pair1.prevTx, 0)
        unspentTxs.push(pair1.tx)

        var pair2 = createTxPair(address2, 510000) // enough for value and fee
        wallet.processTx(pair2.tx, pair2.prevTx, 0)
        unspentTxs.push(pair2.tx)

        function createTxPair(address, amount) {
          var prevTx = new Transaction()
          prevTx.addInput(new Transaction(), 0)
          prevTx.addOutput(to, amount)

          var tx = new Transaction()
          tx.addInput(prevTx, 0)
          tx.addOutput(address, amount)

          return { prevTx: prevTx, tx: tx }
        }
      })

      describe('transaction outputs', function(){
        it('includes the specified address and amount', function(){
          var tx = wallet.createTx(to, value)

          assert.equal(tx.outs.length, 1)
          var out = tx.outs[0]
          var outAddress = Address.fromOutputScript(out.script, testnet)

          assert.equal(outAddress.toString(), to)
          assert.equal(out.value, value)
        })

        describe('change', function(){
          it('uses the next change address', function(){
            var fee = 0
            var tx = wallet.createTx(to, value, fee)

            assert.equal(tx.outs.length, 2)
            var out = tx.outs[1]
            var outAddress = Address.fromOutputScript(out.script, testnet)

            assert.equal(outAddress.toString(), wallet.getNextChangeAddress())
            assert.equal(out.value, 10000)
          })

          it('skips change if it is not above dust threshold', function(){
            var fee = 14570
            var tx = wallet.createTx(to, value)
            assert.equal(tx.outs.length, 1)
          })
        })
      })

      describe('choosing utxo', function(){
        it('takes fees into account', function(){
          var tx = wallet.createTx(to, value)

          assert.equal(tx.ins.length, 1)
          assert.deepEqual(tx.ins[0].hash, unspentTxs[2].getHash())
          assert.equal(tx.ins[0].index, 0)
        })
      })

      describe('transaction fee', function(){
        it('allows fee to be specified', function(){
          var fee = 30000
          var tx = wallet.createTx(to, value, fee)

          assert.equal(getFee(tx), fee)
        })

        it('allows fee to be set to zero', function(){
          value = 510000
          var fee = 0
          var tx = wallet.createTx(to, value, fee)

          assert.equal(getFee(tx), fee)
        })

        function getFee(tx) {
          var inputValue = tx.ins.reduce(function(memo, input){
            var id = Array.prototype.reverse.call(input.hash).toString('hex')
            var prevTx = unspentTxs.filter(function(t) {
              return t.getId() === id
            })[0]
            return memo + prevTx.outs[0].value
          }, 0)

          return tx.outs.reduce(function(memo, output){
            return memo - output.value
          }, inputValue)
        }
      })
    })
  })
})
