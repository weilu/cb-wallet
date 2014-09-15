var assert = require('assert')
var validate = require('../validator')
var networks = require('bitcoinjs-lib').networks

describe('validator', function(){
  describe('preCreateTx', function(){
    var network = networks.testnet

    describe('destination address validation', function(){
      var value = 1000

      it('catches invalid address', function(){
        var to = '123'
        assert.throws(function() {
          validate.preCreateTx(to, value, network)
        }, /Invalid checksum/)
      })

      it('catches address with the wrong version', function(){
        var to = 'LNjYu1akN22USK3sUrSuJn5WoLMKX5Az9B'
        assert.throws(function() {
          validate.preCreateTx(to, value, network)
        }, /Invalid address version/)
      })

      it('allows valid pubKeyHash address', function(){
        var to = 'mmGUSgaP7E8ig34MG2w1HzVjgwbqJoRQQu'
        assert.doesNotThrow(function() {
          validate.preCreateTx(to, value, network)
        })
      })

      it('allows valid p2sh address', function(){
        var to = '2MvR3wixpB1usCNRugN6ufwxfT4GEFxoRhQ'
        assert.doesNotThrow(function() {
          validate.preCreateTx(to, value, network)
        })
      })
    })

    describe('when value is below dust threshold', function(){
      it('throws an error', function(){
        var value = 546
        var to = 'mmGUSgaP7E8ig34MG2w1HzVjgwbqJoRQQu'

        assert.throws(function() {
          validate.preCreateTx(to, value, network)
        }, /546 must be above dust threshold \(546 Satoshis\)/)
      })
    })
  })

  describe('postCreateTx', function(){
    describe('when there is not enough money', function(){
      it('throws an error', function(){
        assert.throws(function() {
          validate.postCreateTx(1410001, 1410000)
        }, /Not enough funds \(incl. fee\): 1410000 < 1410001/)
      })
    })
  })
})
