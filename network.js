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
    var balanceAndAddresses = {}

    balanceAndAddresses.balance = results[0].balance + results[1].balance
    balanceAndAddresses.addresses = results[0].addresses
    balanceAndAddresses.changeAddresses = results[1].addresses

    callback(null, balanceAndAddresses)
  })
}

function discoverUsedAddresses(account, api, done) {
  var usedAddresses = []
  var balance = 0

  discover(account, 5, function(addresses, callback) {

    usedAddresses = usedAddresses.concat(addresses)

    api.addresses.get(addresses, function(err, results) {
      if (err) return callback(err);

      var areSpent = results.map(function(result) {
        return result.totalReceived > 0
      })

      balance = results.reduce(function(memo, result) {
        return memo + result.balance
      }, balance)

      callback(undefined, areSpent)
    })
  }, function(err, k) {
    if (err) return done(err);

    console.info('Discovered ' + k + ' addresses')

    var data = {
      addresses: usedAddresses.slice(0, k),
      balance: balance
    }
    done(null, data)
  })
}

function fetchTransactions(api, addresses, done) {
  api.addresses.transactions(addresses, null, function(err, transactions) {
    if(err) return done(err);

    var txsAndConfs = parseTransactions(transactions)

    api.transactions.get(getAdditionalTxIds(txsAndConfs.txs), function(err, transactions) {
      if(err) return done(err);

      var additionalTxsAndConfs = parseTransactions(transactions)

      var txs = txsAndConfs.txs.concat(additionalTxsAndConfs.txs)
      var confirmations = txsAndConfs.confirmations.concat(additionalTxsAndConfs.confirmations)

      if(txs.length !== confirmations.length) {
        return done(new Error("expect confirmations fetched for every transaction"))
      }

      var metadata = txs.reduce(function(memo, tx, i) {
        memo[tx.getId()] = { confirmations: confirmations[i] }
        return memo
      }, {})

      done(null, txs, metadata)
    })
  })
}

function parseTransactions(transactions) {
  return transactions.reduce(function(memo, t) {
    memo.txs.push(bitcoin.Transaction.fromHex(t.hex))
    memo.confirmations.push(t.confirmations)

    return memo
  }, {txs: [], confirmations: []})
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
