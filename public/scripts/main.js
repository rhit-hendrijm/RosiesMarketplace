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

function goToProfile() {
	window.location.href = "/profile.html";
};

function goToChat() {
	window.location.href = "/chat.html";
};

rhit.main = function () {
	console.log("Ready");
}

rhit.main();
