var rhit = rhit || {};

function switchToBuyingTab() {
	var buying = document.getElementById("buying");
	var selling = document.getElementById("selling");
	buying.style.display = "block";
	selling.style.display = "none";
};

function switchToSellingTab() {
	var buying = document.getElementById("buying");
	var selling = document.getElementById("selling");
	selling.style.display = "block";
	buying.style.display = "none";
};

rhit.main = function () {
	console.log("Ready");
}

rhit.main();
