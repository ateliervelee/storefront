// Admin Panel Authentication and UI Management
class AdminPanel {
    constructor() {
        this.auth = null;
        this.currentUser = null;
        this.init();
    }

    init() {
        // Check if Firebase is already loaded
        if (typeof firebase !== 'undefined' && window.firebaseServices) {
            this.setupFirebase();
        } else {
            // Wait a bit for Firebase to load
            setTimeout(() => {
                this.setupFirebase();
            }, 1000);
        }
    }

    setupFirebase() {
        if (typeof firebase === 'undefined') {
            return;
        }

        if (!window.firebaseServices) {
            return;
        }

        this.auth = window.firebaseServices.auth;
        this.setupAuthListeners();
        this.setupUI();
    }

    setupAuthListeners() {
        // Listen for authentication state changes
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.showWelcomeMessage(user);
            } else {
                this.currentUser = null;
                this.showLoginDialog();
            }
        });
    }

    setupUI() {
        const loginButton = document.getElementById('loginButton');
        const logoutButton = document.getElementById('logoutButton');
        const signOutButton = document.getElementById('signOutButton');
        const loading = document.getElementById('loading');
        const errorMessage = document.getElementById('errorMessage');

        // Google Sign In
        if (loginButton) {
            loginButton.addEventListener('click', async () => {
                try {
                    this.showLoading(true);
                    this.hideError();
                    
                    const provider = new firebase.auth.GoogleAuthProvider();
                    provider.addScope('email');
                    provider.addScope('profile');
                    
                    await this.auth.signInWithPopup(provider);
                    
                } catch (error) {
                    console.error('Login error:', error);
                    this.showError(this.getErrorMessage(error));
                } finally {
                    this.showLoading(false);
                }
            });
        }

        // Sign Out (both buttons)
        const signOutHandler = async () => {
            try {
                await this.auth.signOut();
            } catch (error) {
                console.error('Logout error:', error);
                this.showError('Failed to sign out. Please try again.');
            }
        };

        if (logoutButton) {
            logoutButton.addEventListener('click', signOutHandler);
        }

        if (signOutButton) {
            signOutButton.addEventListener('click', signOutHandler);
        }
    }

    showLoginDialog() {
        const loginDialog = document.getElementById('loginDialog');
        const welcomeMessage = document.getElementById('welcomeMessage');
        const userHeader = document.getElementById('userHeader');
        const roleBadge = document.getElementById('roleBadge');
        const accessDeniedElement = document.getElementById('accessDenied');
        
        if (loginDialog) loginDialog.style.display = 'block';
        if (welcomeMessage) welcomeMessage.classList.remove('show');
        if (userHeader) userHeader.classList.remove('show');
        if (roleBadge) roleBadge.style.display = 'none';
        if (accessDeniedElement) accessDeniedElement.classList.remove('show');
    }

    async showWelcomeMessage(user) {
        const loginDialog = document.getElementById('loginDialog');
        const welcomeMessage = document.getElementById('welcomeMessage');
        const userHeader = document.getElementById('userHeader');
        const userAvatarHeader = document.getElementById('userAvatarHeader');
        const userNameHeader = document.getElementById('userNameHeader');

        // Update user header info
        if (userAvatarHeader) {
            userAvatarHeader.src = user.photoURL || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiNFOEUzRDgiLz4KPHBhdGggZD0iTTQwIDQwQzQ0LjQxODMgNDAgNDggMzYuNDE4MyA0OCAzMkM0OCAyNy41ODE3IDQ0LjQxODMgMjQgNDAgMjRDMzUuNTgxNyAyNCAzMiAyNy41ODE3IDMyIDMyQzMyIDM2LjQxODMgMzUuNTgxNyA0MCA0MCA0MFoiIGZpbGw9IiM4QjdENkIiLz4KPHBhdGggZD0iTTQwIDQ4QzI5LjUgNDggMjAgNTcuNSAyMCA2N0gyMEMyMCA2NyAyMCA2OCAyMCA2OEMyMCA3Mi40MTgzIDIzLjU4MTcgNzYgMjggNzZINTJDNjYuNTgxNyA3NiA3MCA3Mi40MTgzIDcwIDY4QzcwIDY3IDcwIDY3IDcwIDY3SDYwQzYwIDU3LjUgNTAuNSA0OCA0MCA0OFoiIGZpbGw9IiM4QjdENkIiLz4KPC9zdmc+';
        }
        if (userNameHeader) userNameHeader.textContent = user.displayName || 'Admin User';

        // Hide login dialog and welcome message, show user header
        if (loginDialog) loginDialog.style.display = 'none';
        if (welcomeMessage) welcomeMessage.classList.remove('show');
        if (userHeader) userHeader.classList.add('show');

        // Check if user is an administrator
        await this.checkAdministratorAccess(user);
    }

    async checkAdministratorAccess(user) {
        const db = window.firebaseServices.db;
        const accessDeniedElement = document.getElementById('accessDenied');

        try {
            console.log(`🔍 Checking administrator access for: ${user.email}`);
            
            // Check if user document exists in administrators collection
            const adminDoc = await db.collection('administrators').doc(user.email).get();
            
            if (adminDoc.exists) {
                const adminData = adminDoc.data();
                console.log('✅ User is verified administrator with role:', adminData.role);
                this.showAdminAccess(adminData);
            } else {
                console.log('❌ User is not an administrator');
                this.showAccessDenied(user.email);
            }
        } catch (error) {
            // Handle Firebase permissions error (user doesn't have read access = not an admin)
            if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
                console.log('🚫 Access denied - Firebase security rules blocked access (user is not an admin)');
                this.showAccessDenied(user.email);
            } else {
                // Handle other errors (network issues, etc.)
                console.error('❌ System error checking administrator access:', error);
                this.showError('Failed to verify administrator access due to a system error. Please try again.');
            }
        }
    }

    showAdminAccess(adminData) {
        const roleBadge = document.getElementById('roleBadge');
        const accessDeniedElement = document.getElementById('accessDenied');

        // Update role badge with user's role from Firebase
        if (roleBadge && adminData.role) {
            roleBadge.textContent = adminData.role;
            roleBadge.style.display = 'inline-block';
        }

        if (accessDeniedElement) {
            accessDeniedElement.classList.remove('show');
        }

        console.log('🎉 Administrator access granted');
    }

    showAccessDenied(email) {
        const roleBadge = document.getElementById('roleBadge');
        const accessDeniedElement = document.getElementById('accessDenied');

        // Hide role badge for denied users
        if (roleBadge) {
            roleBadge.style.display = 'none';
        }

        if (accessDeniedElement) {
            accessDeniedElement.classList.add('show');
        }

        console.log(`🚫 Access denied for: ${email}`);
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const loginButton = document.getElementById('loginButton');
        
        if (show) {
            if (loading) loading.classList.add('show');
            if (loginButton) loginButton.disabled = true;
        } else {
            if (loading) loading.classList.remove('show');
            if (loginButton) loginButton.disabled = false;
        }
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
        }
    }

    hideError() {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) errorMessage.classList.remove('show');
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                return 'Sign-in was cancelled. Please try again.';
            case 'auth/popup-blocked':
                return 'Sign-in popup was blocked. Please allow popups and try again.';
            case 'auth/unauthorized-domain':
                return 'This domain is not authorized for sign-in. Please contact support.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection and try again.';
            default:
                return 'An error occurred during sign-in. Please try again.';
        }
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
}); 