"use strict";

var bitcoin = require('bitcoinjs-lib')
var discover = require('bip32-utils').discovery
var async = require('async')

function discoverAddressesForAccounts(api, externalAccount, internalAccount, callback) {
  var functions = [externalAccount, internalAccount].map(function(account) {
    return function(cb) { discoverUsedAddresses(account, api, cb) }
  })

  async.parallel(functions, function(err, results) {
    if(err) return callback(err);

    callback(null, results[0], results[1])
  })
}

function discoverUsedAddresses(account, api, done) {
  var usedAddresses = []

  discover(account, 5, function(addresses, callback) {

    api.addresses.get(addresses, function(err, results) {
      if (err) return callback(err);

      callback(undefined, results.map(function(result, i) {
        if (result.txCount > 0) {
          usedAddresses.push(addresses[i])
          return true
        }
      }))
    })
  }, function(err, k) {
    if (err) return done(err);

    console.info('Discovered ' + k + ' addresses')
    
    done(null, usedAddresses)
  })
}

function fetchTransactions(api, addresses, done) {
  api.addresses.transactions(addresses, null, function(err, transactions) {
    if(err) return done(err);

    var parsed = parseTransactions(transactions)

    api.transactions.get(getAdditionalTxIds(parsed.txs), function(err, transactions) {
      if(err) return done(err);

      parsed = parseTransactions(transactions, parsed)
      done(null, parsed.txs, parsed.metadata)
    })
  })
}

function parseTransactions(transactions, initialValue) {
  initialValue = initialValue || {txs: [], metadata: {}}
  return transactions.reduce(function(memo, t) {
    var tx = bitcoin.Transaction.fromHex(t.hex)
    memo.txs.push(tx)
    memo.metadata[tx.getId()] = {
      confirmations: t.confirmations,
      timestamp: t.timestamp
    }

    return memo
  }, initialValue)
}

function getAdditionalTxIds(txs) {
  var inputTxIds = txs.reduce(function(memo, tx) {
    tx.ins.forEach(function(input) {
      var hash = new Buffer(input.hash)
      Array.prototype.reverse.call(hash)
      memo[hash.toString('hex')] = true
    })
    return memo
  }, {})

  var txIds = txs.map(function(tx) { return tx.getId() })

  return Object.keys(inputTxIds).filter(function(id) {
    return txIds.indexOf(id) < 0
  })
}

module.exports = {
  discoverAddresses: discoverAddressesForAccounts,
  fetchTransactions: fetchTransactions
}
