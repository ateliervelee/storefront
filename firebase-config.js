// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCIQQAqxJcvcDS4VylQXPlAquQW53n8i_Q",
    authDomain: "atelier-velee.firebaseapp.com",
    projectId: "atelier-velee",
    storageBucket: "atelier-velee.firebasestorage.app",
    messagingSenderId: "79320471162",
    appId: "1:79320471162:web:ff6d40757f46c7b6d80dc3",
    measurementId: "G-38WKQLDVM4"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
} catch (error) {
    console.error('Firebase initialization failed:', error);
}

// Initialize Firebase services
try {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const analytics = firebase.analytics();

    // Set auth persistence to LOCAL (persists across browser sessions)
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(() => {
        console.log('🔐 Firebase Auth persistence set to LOCAL');
    }).catch((error) => {
        console.error('❌ Failed to set auth persistence:', error);
    });

    // Export Firebase services for use in other scripts
    window.firebaseServices = {
        auth,
        db,
        analytics
    };
    
    console.log('✅ Firebase services initialized successfully');
} catch (error) {
    console.error('Firebase services initialization failed:', error);
} 