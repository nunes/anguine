function MainCtrl($scope) {

	var addresses = $scope.addresses = [];

	$scope.newBtcAddress = '';
	$scope.newBtcLabel = '';
	$scope.removeBtcAddress = '';

	$scope.addressCount = $scope.addresses.length;

	$scope.$watch('addresses', function() {
		$scope.addressCount = $scope.addresses.length;
		console.log($scope.addressCount);
	}, true);

	$scope.addBtcAddress = function() {
		var newBtcAddress = $scope.newBtcAddress.trim();
		if (!newBtcAddress.length) {
			return;
		}

		var newBtcLabel = $scope.newBtcLabel.trim();

		addresses.push({
			name : newBtcAddress,
			label : newBtcLabel
		});

		$scope.newBtcAddress = '';
		$scope.newBtcLabel = '';

		$('#addBtcAddressModal').modal('hide');

	};

	$scope.confirmRemoveBtcAddress = function() {
		addresses.splice(addresses.indexOf($scope.removeBtcAddress), 1);
		$('#deleteBtcAddressModal').modal('hide');

	}

	$scope.openRemoveBtcAddress = function(address) {
		$scope.removeBtcAddress = address;
	}

}
