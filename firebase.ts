// lib/firebase.ts
import { initializeApp } from "firebase/app"
import { getDatabase, ref, onValue, set, update, remove } from "firebase/database"

// TODO: Replace with your actual Firebase configuration
// You can find this in your Firebase project settings -> Project settings -> Your apps -> Web app -> Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

export { database, ref, onValue, set, update, remove }
