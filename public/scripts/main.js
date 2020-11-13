var rhit = rhit || {};

rhit.FB_COLLECTION_LISTING = "listing";
rhit.FB_KEY_NAME = "name";
rhit.FB_KEY_PHOTO = "photo";
rhit.FB_KEY_PRICE = "price";
rhit.FB_KEY_LAST_TOUCHED = "lastTouched";
rhit.FB_KEY_AUTHOR = "author";
rhit.fbListingsManager = null;
rhit.fbSingleListingManager = null;
rhit.fbAuthManager = null;

//From: https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
   }
   

rhit.ListPageController = class {
	constructor() {
		this.newList = htmlToElement('<div id="listings"></div>');
		document.querySelector("#buyingTab").addEventListener("click", (event) => {
			window.location.href = "/buying.html";
		});

		document.querySelector("#sellingTab").addEventListener("click", (event) => {
			window.location.href = `/selling.html?uid=${rhit.fbAuthManager.uid}`;
		});
		document.querySelector("#profileButton").addEventListener("click", (event) => {
			window.location.href = `/profile.html?uid=${rhit.fbAuthManager.uid}`;
		});
		document.querySelector("#signOutButton").addEventListener("click", (event) => {
			rhit.fbAuthManager.signOut();
		});
		document.querySelector("#prevPage").addEventListener("click", (event) => {
			var min = parseFloat(document.querySelector("#count").value);
			if (min-4 >= 0) {
				min -=4;
			}
			var max = min + 4;
			if (min < 0) {
				min = 0;
				max = 4;
			}
			if (document.querySelector("#count").value-4 >=0) {
				document.querySelector("#count").value -=4;
			}
			console.log("min: " + min + ", max: " + max);
			this.paginate(min, max);
			this.updateList();
		});
		document.querySelector("#nextPage").addEventListener("click", (event) => {
			var min = parseFloat(document.querySelector("#count").value);
			if (min+4 < rhit.fbListingsManager.length) {
				min +=4;
			}
			var max = min + 4;
			if (max > rhit.fbListingsManager.length) {
				max = rhit.fbListingsManager.length;
			}
			if (document.querySelector("#count").value+4 < rhit.fbListingsManager.length) {
				document.querySelector("#count").value +=4;
			}

			console.log("min: " + min + ", max: " + max);
			this.paginate(min, max);
			this.updateList();
		});

		rhit.fbListingsManager.beginListening(this.updateList.bind(this));
	}

	_createCard(listing) {
		return htmlToElement(`<div class="buyingListing"><img src="${listing.photo}"
		alt="${listing.name}" <p class="caption">${listing.name} - $${listing.price}</p>
		</div>`);
	}

	updateList() {
		if(document.querySelector("#count").value == 0) {
			this.paginate(0,4);
		}
		const oldList = document.querySelector("#listings");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(this.newList);
	}

	paginate(start, end) {
		this.newList = htmlToElement('<div id="listings"></div>');
		for (let i = start; i < end; i++) {
			const ls = rhit.fbListingsManager.getListingAtIndex(i);
			const newCard = this._createCard(ls);
			newCard.onclick = (event) => {
				window.location.href = `/listing.html?id=${ls.id}`;
			}
			this.newList.appendChild(newCard);
		}
	}		
}

rhit.MyListingsController = class {
	constructor() {
		document.querySelector("#buyingTab").addEventListener("click", (event) => {
			window.location.href = "/buying.html";
		});

		document.querySelector("#sellingTab").addEventListener("click", (event) => {
			window.location.href = `/selling.html?uid=${rhit.fbAuthManager.uid}`;
		});
		document.querySelector("#profileButton").addEventListener("click", (event) => {
			window.location.href = `/profile.html?uid=${rhit.fbAuthManager.uid}`;
		});
		document.querySelector("#submitAddListing").addEventListener("click", (event) => {
			const name = document.querySelector("#name").value;
			const price = document.querySelector("#price").value;
			const photo = document.querySelector("#photo").value;
			rhit.fbMyListingsManager.add(name, price, photo);
		});
		$("#addListing").on("show.bs.modal", (event) => {
			document.querySelector("#name").value = "";
			document.querySelector("#price").value = "";
			document.querySelector("#photo").value = "";
		});
		$("#addListing").on("shown.bs.modal", (event) => {
			document.querySelector("#name").focus();
		});
		rhit.fbMyListingsManager.beginListening(this.updateList.bind(this));
	}

	_createCard(listing) {
		return htmlToElement(`<div class="sellingListing">
		<img style="width:300px;"src="${listing.photo}"
			alt="${listing.name}">
		<div class="sellingNameAndPrice">
			<h3>${listing.name}</h3>
			<h4>$${listing.price}</h4>
		</div>
		<div class="sellingManageListing">Manage Listing</div>
		</div>`);
	}
	

	updateList() {
		console.log("num quotes = ", rhit.fbMyListingsManager.length);
		console.log("ex quote: ", rhit.fbMyListingsManager.getListingAtIndex(0));
		const newList = htmlToElement('<div id="activeListings"><p class="listingStatus">Active</p></div>');
		for (let i = 0; i < rhit.fbMyListingsManager.length; i++) {
			const ls = rhit.fbMyListingsManager.getListingAtIndex(i);
			const newCard = this._createCard(ls);
			newCard.onclick = (event) => {
				window.location.href = `/editListing.html?id=${ls.id}`;
			}
			newList.appendChild(newCard);
		}
		const oldList = document.querySelector("#activeListings");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);
	}
}

rhit.Listing = class {
	constructor(id, name, photo, price) {
		this.id = id;
		this.name = name;
		this.photo = photo;
		this.price = price;
	}
}

rhit.Chat = class {
	constructor(id, chat, listing) {
		this.id = id;
		this.chat = chat;
		this.listing = listing;
	}
}

rhit.fbListingsManager = class {
	constructor(uid) {
		this._uid = uid;
		this._documentSnapshots = [];
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_LISTING);
		this._unsubscribe = null;
	}
	add(name, photo, price) {  
		this._ref.add({
			[rhit.FB_KEY_NAME]: name,
			[rhit.FB_KEY_PHOTO]: photo,
			[rhit.FB_KEY_PRICE]: price,
			[rhit.FB_KEY_AUTHOR]: rhit.fbAuthManager.uid,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
		})
		.then(function (docRef) {
			console.log("Document written with ID: ", docRef.id);
		})
		.catch(function (error) {
			console.log("Error adding document: ", error);
		});

	}

	beginListening(changeListener) { 
		let query = this._ref.orderBy(rhit.FB_KEY_LAST_TOUCHED, "desc");
 
		if (this._uid) {
			query = query.where(rhit.FB_KEY_AUTHOR, "==", this._uid);
		}
		
		this._unsubscribe = query.onSnapshot((querySnapshot) => {
			this._documentSnapshots = querySnapshot.docs;
			changeListener();
    	});
	}
	stopListening() {    
		this._unsubscribe();
	}
	get length() { 
		return this._documentSnapshots.length;
	}

	getListingAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		console.log(docSnapshot);
		const ls = new rhit.Listing(
			docSnapshot.id, 
			docSnapshot.get(rhit.FB_KEY_NAME),
			docSnapshot.get(rhit.FB_KEY_PHOTO),
			docSnapshot.get(rhit.FB_KEY_PRICE)
		);
		return ls;
	}
}

rhit.fbChatsManager = class {
	constructor(listingID) {
		this._uid = listingID;
		this._documentSnapshots = [];
		this._ref = firebase.firestore().collection("chat");
		this._unsubscribe = null;
	}
	add(chat, listing) {  
		console.log("chat: " + chat + ", listing :", listing);
		this._ref.add({
			["chat"]: chat,
			["listing"]: listing,
			[rhit.FB_KEY_AUTHOR]: rhit.fbAuthManager.uid,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
		})
		.then(function (docRef) {
			console.log("Document written with ID: ", docRef.id);
		})
		.catch(function (error) {
			console.log("Error adding document: ", error);
		});

	}

	beginListening(changeListener) { 
		let query = this._ref.orderBy(rhit.FB_KEY_LAST_TOUCHED, "desc");
 
		if (this._uid) {
			query = query.where("listing", "==", this._uid);
		}
		
		this._unsubscribe = query.onSnapshot((querySnapshot) => {
			this._documentSnapshots = querySnapshot.docs;
			changeListener();
    	});
	}
	stopListening() {    
		this._unsubscribe();
	}
	get length() { 
		return this._documentSnapshots.length;
	}

	getChatAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const ls = new rhit.Chat(
			docSnapshot.id, 
			docSnapshot.get("chat"),
			docSnapshot.get("listing")
		);
		return ls;
	}
}

rhit.fbMyListingsManager = class {
	constructor(uid) {
		this._uid = uid;
		this._documentSnapshots = [];
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_LISTING);
		this._unsubscribe = null;
	}
	add(name, price, photo) {  
		this._ref.add({
			[rhit.FB_KEY_NAME]: name,
			[rhit.FB_KEY_PHOTO]: photo,
			[rhit.FB_KEY_PRICE]: price,
			[rhit.FB_KEY_AUTHOR]: rhit.fbAuthManager.uid,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
		})
		.then(function (docRef) {
			console.log("Document written with ID: ", docRef.id);
		})
		.catch(function (error) {
			console.log("Error adding document: ", error);
		});

	}
	beginListening(changeListener) {  
		let query = this._ref.orderBy(rhit.FB_KEY_LAST_TOUCHED, "desc").limit(50)
		if (this._uid) {
			query = query.where(rhit.FB_KEY_AUTHOR, "==", this._uid);
		}
		this._unsubscribe = query.onSnapshot((querySnapshot) => {
			this._documentSnapshots = querySnapshot.docs;
			changeListener();
    	});
	}
	stopListening() {    
		this._unsubscribe();
	}
	get length() { 
		return this._documentSnapshots.length;
	}
	getListingAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const ls = new rhit.Listing(
			docSnapshot.id, 
			docSnapshot.get(rhit.FB_KEY_NAME),
			docSnapshot.get(rhit.FB_KEY_PHOTO),
			docSnapshot.get(rhit.FB_KEY_PRICE)
		);
		return ls;
	}
}

rhit.DetailPageController = class {
	constructor() {
		document.querySelector("#sendMessage").addEventListener("click", (event) => {
			const chat = document.querySelector("#messageInput").value;
			const urlParams = new URLSearchParams(window.location.search);
			const listing = urlParams.get("id");
			rhit.fbChatsManager.add(chat, listing);
		});

		rhit.fbSingleListingManager.beginListening(this.updateView.bind(this));
		rhit.fbChatsManager.beginListening(this.updateView.bind(this));
	}

	_createCard(chat) {
		return htmlToElement(`<div class="card chat">
		<div class="card-body">
		  <h4 class="cardText">${chat.chat}</h4>
		  </div>
	  </div>`);
	}

	updateView() {  
		document.querySelector("#cardImageURL").src = rhit.fbSingleListingManager.photo;
		document.querySelector("#cardCaption").innerHTML = rhit.fbSingleListingManager.name + " - $" + rhit.fbSingleListingManager.price;

		const newList = htmlToElement('<div id="chats"></div>');
		for (let i = 0; i < rhit.fbChatsManager.length; i++) {
			const ch = rhit.fbChatsManager.getChatAtIndex(i);
			const newCard = this._createCard(ch);
			newList.appendChild(newCard);
		}
		const oldList = document.querySelector("#chats");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);
	}
}

rhit.EditListingController = class {
	constructor() {
		document.querySelector("#submitEditListing").addEventListener("click", (event) => {
			const name = document.querySelector("#name").value
			const price = document.querySelector("#price").value;
			const photo = document.querySelector("#photo").value;
			rhit.fbSingleListingManager.update(name, price, photo);
		});

		document.querySelector("#deleteListing").addEventListener("click", (event) => {
			rhit.fbSingleListingManager.delete().then(function () {
				console.log("Document successfully deleted!");
				window.location.href = `/selling.html?uid=${rhit.fbAuthManager.uid}`;
			}).catch(function (error) {
				console.log("Error removing document: ", error);
			});
		});

		$("#editListingModal").on("show.bs.modal", (event) => {
			document.querySelector("#name").value = rhit.fbSingleListingManager.name;
			document.querySelector("#price").value = rhit.fbSingleListingManager.price;
			document.querySelector("#photo").value = rhit.fbSingleListingManager.photo;
		});

		$("#editListingModal").on("shown.bs.modal", (event) => {
			document.querySelector("#name").focus();
		});

		rhit.fbSingleListingManager.beginListening(this.updateView.bind(this));
	}

	updateView() {  
		document.querySelector("#cardImageURL").src = rhit.fbSingleListingManager.photo;
		document.querySelector("#cardCaption").innerHTML = rhit.fbSingleListingManager.name + " - $" + rhit.fbSingleListingManager.price;
	}
}

rhit.ProfileController = class {
	constructor() {
		document.querySelector("#submitEditName").addEventListener("click", (event) => {
			const fName = document.querySelector("#fName").value;
			const lName = document.querySelector("#lName").value;
			rhit.fbProfileManager.update(fName, lName);
		});

		$("#editNameModal").on("show.bs.modal", (event) => {
			document.querySelector("#fName").value = rhit.fbProfileManager.firstName;
			document.querySelector("#lName").value = rhit.fbProfileManager.lastName;
		});

		$("#editNameModal").on("shown.bs.modal", (event) => {
			document.querySelector("#fName").focus();
		});

		rhit.fbProfileManager.beginListening(this.updateView.bind(this));
	}

	updateView() {  
		document.querySelector("#firstName").innerHTML = rhit.fbProfileManager.firstName;
		document.querySelector("#lastName").innerHTML = rhit.fbProfileManager.lastName;
	}
}

rhit.fbSingleListingManager = class {
	constructor(listingID) {
	  this._documentSnapshot = {};
	  this._unsubscribe = null;
	  this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_LISTING).doc(listingID);
	}
	beginListening(changeListener) {
		this._unsubscribe = this._ref.onSnapshot((doc) => {
			if (doc.exists) {
				console.log("Document data:", doc.data());
				this._documentSnapshot = doc;
				changeListener();
			} else {
				console.log("No such document");
			}
		});
	}

	stopListening() {
	  this._unsubscribe();
	}
	update(name, price, photo) {
		this._ref.update({
			[rhit.FB_KEY_NAME]: name,
			[rhit.FB_KEY_PRICE]: price,
			[rhit.FB_KEY_PHOTO]: photo,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
		})
		.then(() => {
			console.log("Document successfully updated");
			window.location.href = `/selling.html?uid=${rhit.fbAuthManager.uid}`;
		})
		.catch(function (error) {
			console.log("Error updating document: ", error);
		});
	}
	delete() {
		return this._ref.delete();
	}

	get name() {
		return this._documentSnapshot.get(rhit.FB_KEY_NAME);
	}

	get photo() {
		return this._documentSnapshot.get(rhit.FB_KEY_PHOTO);
	}

	get price() {
		return this._documentSnapshot.get(rhit.FB_KEY_PRICE);
	}

	get author() {
		return this._documentSnapshot.get(rhit.FB_KEY_AUTHOR);
	}
}

rhit.fbProfileManager = class {
	constructor(userID) {
	  this._documentSnapshot = {};
	  this._unsubscribe = null;
	  this._ref = firebase.firestore().collection("user").doc(userID);
	}
	beginListening(changeListener) {
		this._unsubscribe = this._ref.onSnapshot((doc) => {
			if (doc.exists) {
				console.log("Document data:", doc.data());
				this._documentSnapshot = doc;
				changeListener();
			} else {
				console.log("No such document");
			}
		});
	}
	stopListening() {
	  this._unsubscribe();
	}
	update(firstName, lastName) {
		this._ref.update({
			["firstName"]: firstName,
			["lastName"]: lastName,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
		})
		.then(() => {
			console.log("Document successfully updated");
		})
		.catch(function (error) {
			console.log("Error updating document: ", error);
		});
	}
	delete() {
		return this._ref.delete();
	}

	get firstName() {
		return this._documentSnapshot.get("firstName");
	}

	get lastName() {
		return this._documentSnapshot.get("lastName");
	}
}

rhit.LoginPageController = class {
	constructor() {
		rhit.startFirebaseUI();
		document.querySelector("#rosefireButton").onclick = () => {
			rhit.fbAuthManager.signIn();
		};
	}
}

rhit.FbAuthManager = class {
	constructor() {
		this._user = null;
	}
	beginListening(changeListener) {
		firebase.auth().onAuthStateChanged((user) => {
			this._user = user;
			changeListener();
		});
	}
	signIn() {
		Rosefire.signIn("cd474d51-bd2f-4363-a62b-afddca7cf4e1", (err, rfUser) => {
			if (err) {
			  console.log("Rosefire error!", err);
			  return;
			}
			console.log("Rosefire success!", rfUser);

			firebase.auth().signInWithCustomToken(rfUser.token).catch((error) => {
				const errorCode = error.code;
				const errorMessage = error.message;
				if (errorCode === 'auth/invalid-custom-token') {
					alert('The token you provided is not valid.');
				} else {
					console.log("Custom auth error", errorCode, errorMessage);
				}
			});
			
		  });
		  
	}
	signOut() {
		firebase.auth().signOut().catch(function(error) {
			console.log("Sign out error");
		});
	}
	get isSignedIn() {
		return !!this._user;
	}
	get uid() {
		return this._user.uid;
	}
}

rhit.startFirebaseUI = function () {
	var uiConfig = {
		signInSuccessUrl: '/',
		signInOptions: [
			firebase.auth.GoogleAuthProvider.PROVIDER_ID,
			firebase.auth.EmailAuthProvider.PROVIDER_ID,
			firebase.auth.PhoneAuthProvider.PROVIDER_ID,
		],
	};
	const ui = new firebaseui.auth.AuthUI(firebase.auth());
	ui.start('#firebaseui-auth-container', uiConfig);
}

rhit.checkForRedirects = function() {
	if (document.querySelector("#loginPage") && rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/buying.html";
	}

	if (!document.querySelector("#loginPage") && !rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/";
	}
}

rhit.initializePage = function() {
	const urlParams = new URLSearchParams(window.location.search);

	if (document.querySelector("#buyingPage")) {
		console.log("You are on the buying page.");
		const uid = urlParams.get("uid");
		rhit.fbListingsManager = new rhit.fbListingsManager(uid);
		new rhit.ListPageController();
	}

	if (document.querySelector("#sellingPage")) {
		console.log("You are on the selling page.");
		const uid = urlParams.get("uid");
		rhit.fbMyListingsManager = new rhit.fbMyListingsManager(uid);
		new rhit.MyListingsController();
	}

	if (document.querySelector("#detailPage")) {
		console.log("You are on the detail page.");
		const listingID = urlParams.get("id");
		if (!listingID) {
			window.location.href = "/";
		}
		rhit.fbSingleListingManager = new rhit.fbSingleListingManager(listingID);
		rhit.fbChatsManager = new rhit.fbChatsManager(listingID);
		new rhit.DetailPageController();
	}

	if (document.querySelector("#profilePage")) {
		console.log("You are on the profile page.");
		const profileID = rhit.fbAuthManager.uid;
		if (!profileID) {
			window.location.href = "/";
		}
		rhit.fbProfileManager = new rhit.fbProfileManager(profileID);
		new rhit.ProfileController();
	}

	if (document.querySelector("#editListingPage")) {
		console.log("You are on the edit listing page.");
		const listingID = urlParams.get("id");
		if (!listingID) {
			window.location.href = "/";
		}
		rhit.fbSingleListingManager = new rhit.fbSingleListingManager(listingID);
		new rhit.EditListingController();
	}

	if (document.querySelector("#loginPage")) {
		console.log("You are on the login page.");
		new rhit.LoginPageController();
	}
}
   
rhit.main = function () {
	console.log("Ready");
	rhit.fbAuthManager = new rhit.FbAuthManager();
	rhit.fbAuthManager.beginListening(() => {
		console.log("auth change callback fired. TODO: check for redirects and init the page");
		console.log("isSignedIn = ", rhit.fbAuthManager.isSignedIn);
		rhit.checkForRedirects();
		rhit.initializePage();
	});
};

rhit.main();
