var mobileRechargeApp = angular.module('mobileRechargeApp', ['config']);

mobileRechargeApp.controller('mobileRechargeCtrl', ['$scope', '$http', '$sce', 'BASE_URL', 'API_KEY',
  function mobileRechargeCtrl($scope, $http, $sce, BASE_URL, API_KEY) {
    $http.get(BASE_URL+'/util/countries').success(function(data) {
      $scope.countries = data;
      $scope.matching = [data.slice(0).sort(function(a,b) { return b.prefix.length- a.prefix.length; })];
    }).error(connectionFailed);

    $scope.emptyCountry = {
      id: "{{countryCode}}",
      prefix: "",
      name: ""
    };
    $scope.setCountry = function(c) {
      if($scope.number && c.prefix) {
        var regexp = new RegExp("^[^0-9]*"+ c.prefix);
        $scope.number = ($scope.prefix+$scope.number).replace(regexp, "");
      }
      $scope.prefix = c.prefix?"+"+c.prefix:"";
      $scope.countryCode = c.id;
      $scope.countryName = c.name;
      $("#countries").parent().removeClass('open');
      $("#number").focus();
    };
    $scope.setCountry($scope.emptyCountry);

    String.prototype.beginsWith = function(that) {
      return that == this.substr(0,that.length);
    };
    $scope.flagUpdate = function() {
      var msisdn = $scope.prefix.replace("+","") + $scope.number.replace(/[^0-9]+/,"");
      if (msisdn.length == 0) {
        $scope.setCountry($scope.emptyCountry);
      } else {
        var matching = [];
        for(i in $scope.matching[msisdn.length-1]) {
          if(msisdn.beginsWith($scope.matching[msisdn.length-1][i].prefix.substr(0,msisdn.length))) {
            matching[matching.length] = $scope.matching[msisdn.length-1][i];
          }
        }
        $scope.matching[msisdn.length] = matching;
        if(msisdn[0] == "7" && $scope.countryCode != 'ru' && $scope.countryCode != 'kz') {
          $scope.setCountry({
            prefix: "7",
            id: "rukz",
            name: "Russia / Kazakhstan"
          });
        } else {
          for(i in matching) {
            if(msisdn.beginsWith(matching[i].prefix)) {
              $scope.setCountry(matching[i]);
              break;
            }
          }
        }
      }
    }
    $scope.keyDown = function(event) {
      if(event.keyCode == 8 && !$scope.number) {
        $scope.number = $scope.prefix;
        $scope.setCountry($scope.emptyCountry);
      }
      if(event.keyCode == 13) $scope.check();
    }

    function zip(arrays) {
      return arrays[0].map(function(_,i){
        return arrays.map(function(array){return array[i]})
      });
    }
    function connectionFailed(data) {
      $scope.checkLoading = "";
      $scope.payLoading = "";
      $scope.setMessage("alert-danger", data.errorMessage?data.errorMessage:"Request failed, please, check your internet connection");
    }

    $scope.check = function() {
      $scope.checkLoading = "loading";
      var msisdn = $scope.prefix.replace("+","")+$scope.number;
      $scope.numberInfo = $scope.message = null;
      $http.get(BASE_URL+'/api/check/'+msisdn+'?apiKey='+API_KEY)
        .success(function(data) {
          $scope.checkLoading = "";
          $scope.checkId = data.checkId;
          $scope.numberInfo = {
            "country": data.country,
            "operator": data.operator,
            "products": data.prices,
            "currency": data.currency,
            "min": data.min,
            "max": data.max,
            "rate": data.rate,
            "fee": data.fee,
            "fixedFee": data.fixedFee,
            "minFee": data.minFee,
            "maxFee": data.maxFee
          };
        })
        .error(connectionFailed);
    };

    $scope.pay = function() {
      $scope.payLoading = "loading";
      $http.post(BASE_URL+'/api/order?apiKey='+API_KEY,
        {checkId: $scope.checkId, product: $scope.product.product})
        .success(function(data) {
          $scope.payLoading = "";
          if (data.errorMessage) $scope.setMessage("alert-danger", data.errorMessage);
          else {
            if (typeof bitcoin != "undefined") {
              bitcoin.sendMoney(data.address, data.total*bitcoin.BTC_IN_SATOSHI, function(success, transactionId) {
                if (success) {
                  $scope.numberInfo = null;
                  bitcoin.getTransaction(transactionId, function(t) {
                    $scope.setMessage('alert-success', 'Thank you! Your payment is accepted!<br/>Transaction will be processed ' +
                      'as soon as we get 3-6 confirmations from the blockchain.');
                    $scope.$apply();
                  });
                }
              });
            } else {
              console.log(data);
            }
          }
        })
        .error(connectionFailed);
    };

    $scope.setMessage = function(level, message) {
      $scope.message = {level: level, text: $sce.trustAsHtml(message)};
    }

    function inLimits(amount, min, max) {
      amount = min? Math.max(amount, min) : amount;
      amount = max? Math.min(amount, max) : amount;
      return amount;
    }

    $scope.changePayAmount = function() {
      if($scope.payAmount == 0) return;
      var realPayAmount = inLimits(
        ($scope.payAmount - $scope.numberInfo.fixedFee)/(1+$scope.numberInfo.fee),
        $scope.numberInfo.maxFee? $scope.payAmount-$scope.numberInfo.maxFee/$scope.numberInfo.rate : 0,
        $scope.numberInfo.minFee? $scope.payAmount-$scope.numberInfo.minFee/$scope.numberInfo.rate : $scope.payAmount
      )
      $scope.receiveAmount = (realPayAmount*$scope.numberInfo.rate).toFixed(2)

      if($scope.receiveAmount > $scope.numberInfo.max) {
        $scope.changeReceiveAmount();
      }
      if($scope.receiveAmount < $scope.numberInfo.min) {
        $scope.wrongAmount = "wrongAmount";
        $scope.product = null;
        $scope.receiveAmount=0;
        return;
      } else {
        $scope.wrongAmount = "";
      }

      $scope.product = {};
      $scope.product.product = $scope.receiveAmount;
      $scope.product.price = $scope.payAmount;
    }

    $scope.changeReceiveAmount = function() {
      if($scope.receiveAmount == 0) return;
      if($scope.receiveAmount > $scope.numberInfo.max)
        $scope.receiveAmount = ($scope.numberInfo.max).toFixed(2);
      if($scope.receiveAmount < $scope.numberInfo.min) {
        $scope.wrongAmount = "wrongAmount";
        $scope.product = null;
        return;
      } else {
        $scope.wrongAmount = "";
      }
      var payAmount = $scope.receiveAmount/$scope.numberInfo.rate;
      var fee = inLimits(
        $scope.numberInfo.fixedFee + $scope.numberInfo.fee*payAmount,
        $scope.numberInfo.minFee/$scope.numberInfo.rate,
        $scope.numberInfo.maxFee/$scope.numberInfo.rate
      );
      $scope.payAmount = (payAmount + fee).toFixed($scope.method?8:2)
      $scope.product = {};
      $scope.product.product = $scope.receiveAmount;
      $scope.product.price = $scope.payAmount;
    }

  }]);

