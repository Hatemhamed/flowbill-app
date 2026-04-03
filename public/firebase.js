/****************************************************
 *  FIREBASE INITIALIZATION FILE
 ****************************************************/

const firebaseConfig = {
  apiKey: "AIzaSyAjsHZTkFBlvtpwBTn1ILmSmI4QJukfGPY",
  authDomain: "smm-invoice-saas.firebaseapp.com",
  projectId: "smm-invoice-saas",
  storageBucket: "smm-invoice-saas.firebasestorage.app",
  messagingSenderId: "329120211488",
  appId: "1:329120211488:web:423299f33250f9ec2b1245"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

console.log("Firebase initialized successfully");
console.log("Loaded API key:", firebaseConfig.apiKey);

