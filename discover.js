"use strict";

var discover = require('bip32-utils').discovery
var async = require('async')

function discoverAddressesForAccounts(externalAccount, internalAccount, api, callback) {
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

module.exports = discoverAddressesForAccounts
