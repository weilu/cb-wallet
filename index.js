"use strict";

var API = require('cb-blockr')
var bitcoin = require('bitcoinjs-lib')
var TxGraph = require('bitcoin-tx-graph')
var discoverAddresses = require('./network').discoverAddresses
var fetchTransactions = require('./network').fetchTransactions

function Wallet(externalAccount, internalAccount, networkName, done) {
  if(arguments.length === 0) return this;

  try {
    this.externalAccount = bitcoin.HDNode.fromBase58(externalAccount)
    this.internalAccount = bitcoin.HDNode.fromBase58(internalAccount)
  } catch(e) {
    return done(e)
  }

  this.networkName = networkName
  this.api = new API(networkName)
  this.txGraph = new TxGraph()

  var that = this

  discoverAddresses(this.api, this.externalAccount, this.internalAccount, function(err, results) {
    if(err) return done(err);

    that.balance = results.balance
    that.addressIndex = results.addresses.length
    that.changeAddressIndex = results.changeAddresses.length

    var addresses = results.addresses.concat(results.changeAddresses)
    fetchTransactions(that.api, addresses, function(err, txs, metadata) {
      if(err) return done(err);

      txs.forEach(function(tx) { that.txGraph.addTx(tx) })

      var feesAndValues = that.txGraph.calculateFeesAndValues(addresses, bitcoin.networks[that.networkName])
      that.txMetadata = mergeMetadata(feesAndValues, metadata)

      done(null, that)
    })
  })
}

Wallet.prototype.getTransactionHistory = function() {
  var txGraph = this.txGraph
  var metadata = this.txMetadata

  var nodes = txGraph.getAllNodes().filter(function(n) {
    return n.tx != null && metadata[n.id].value != null
  }).sort(function(a, b) {
    var confDiff = metadata[a.id].confirmations - metadata[b.id].confirmations
    if(confDiff !== 0) {
      return confDiff
    }

    return txGraph.compareNodes(a, b)
  })

  return nodes.map(function(n) {
    return n.tx
  })
}

Wallet.prototype.getUsedAddresses = function() {
  return deriveAddresses(this.externalAccount, this.addressIndex)
}

Wallet.prototype.getUsedChangeAddresses = function() {
  return deriveAddresses(this.internalAccount, this.changeAddressIndex)
}

Wallet.prototype.serialize = function() {
  var txs = this.txGraph.getAllNodes().reduce(function(memo, node) {
    var tx = node.tx
    if(tx == null) return memo;

    memo.push(tx.toHex())
    return memo
  }, [])

  return JSON.stringify({
    externalAccount: this.externalAccount.toBase58(),
    internalAccount: this.internalAccount.toBase58(),
    addressIndex: this.addressIndex,
    changeAddressIndex: this.changeAddressIndex,
    balance: this.balance,
    networkName: this.networkName,
    txs: txs,
    txMetadata: this.txMetadata
  })
}

Wallet.deserialize = function(json) {
  var wallet = new Wallet()
  var deserialized = JSON.parse(json)
  wallet.externalAccount = bitcoin.HDNode.fromBase58(deserialized.externalAccount)
  wallet.internalAccount = bitcoin.HDNode.fromBase58(deserialized.internalAccount)
  wallet.addressIndex = deserialized.addressIndex
  wallet.changeAddressIndex = deserialized.changeAddressIndex
  wallet.balance = deserialized.balance
  wallet.networkName = deserialized.networkName
  wallet.txMetadata = deserialized.txMetadata

  wallet.txGraph = new TxGraph()
  deserialized.txs.forEach(function(hex) {
    wallet.txGraph.addTx(bitcoin.Transaction.fromHex(hex))
  })

  return wallet
}


function mergeMetadata(feesAndValues, metadata) {
  for(var id in metadata) {
    var fee = feesAndValues[id].fee
    if(fee != null) metadata[id].fee = fee

    var value = feesAndValues[id].value
    if(value < 0) value += fee
    if(value != null) metadata[id].value = value
  }

  return metadata
}

function deriveAddresses(account, untilId) {
  var addresses = []
  for(var i=0; i<untilId; i++) {
    addresses.push(account.derive(i).getAddress().toString())
  }
  return addresses
}

module.exports = Wallet

