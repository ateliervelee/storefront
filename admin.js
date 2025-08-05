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
        const productsSection = document.getElementById('productsSection');

        // Update role badge with user's role from Firebase
        if (roleBadge && adminData.role) {
            roleBadge.textContent = adminData.role;
            roleBadge.style.display = 'inline-block';
        }

        if (accessDeniedElement) {
            accessDeniedElement.classList.remove('show');
        }

        // Show products section
        if (productsSection) {
            productsSection.style.display = 'block';
        }

        console.log('🎉 Administrator access granted');
        
        // Load products after admin access is confirmed
        this.loadAdminContent();
    }

    async loadAdminContent() {
        console.log('📦 Loading admin content...');
        await this.fetchProducts();
    }

    async fetchProducts() {
        const db = window.firebaseServices.db;
        
        try {
            console.log('🔄 Fetching products from Firestore...');
            
            const productsSnapshot = await db.collection('products').get();
            const products = [];
            
            productsSnapshot.forEach(doc => {
                products.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`✅ Fetched ${products.length} products`);
            this.displayProducts(products);
            
        } catch (error) {
            console.error('❌ Error fetching products:', error);
            this.showError('Failed to load products. Please try again.');
        }
    }

    displayProducts(products) {
        const productsContainer = document.getElementById('productsContainer');
        if (!productsContainer) return;

        // Clear existing products
        productsContainer.innerHTML = '';

        if (products.length === 0) {
            productsContainer.innerHTML = '<p style="text-align: center; color: var(--deep-taupe);">No products found.</p>';
            return;
        }

        // Create product cards
        products.forEach(product => {
            const productCard = this.createProductCard(product);
            productsContainer.appendChild(productCard);
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = product.id;

        // Get first image or use placeholder
        const imageUrl = product.images && product.images.length > 0 
            ? product.images[0] 
            : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU0IiBoZWlnaHQ9IjI1NCIgdmlld0JveD0iMCAwIDI1NCAyNTQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTQiIGhlaWdodD0iMjU0IiBmaWxsPSIjRThFM0Q4Ii8+CjxwYXRoIGQ9Ik0xMjcgMTI3QzEzMS40MTggMTI3IDEzNSAxMjMuNDE4IDEzNSAxMTlDMTM1IDExNC41ODE3IDQ0LjQxODMgMjQgMTI3IDExMUMxMjIuNTgyIDExMSAxMTkgMTE0LjU4MiAxMTkgMTE5QzExOSAxMjMuNDE4IDEyMi41ODIgMTI3IDEyNyAxMjdaIiBmaWxsPSIjOEI3RDZCIi8+CjxwYXRoIGQ9Ik0xMjcgMTM1QzExNi41IDEzNSAxMDcgMTQ0LjUgMTA3IDE1NEgxMDdDMTEwIDE1NCAxMTAgMTU1IDExMCAxNTZDMTA3IDE2MC40MTggMTEwLjU4MiAxNjQgMTE1IDE2NEgxMzlDMTQzLjQxOCAxNjQgMTQ3IDE2MC40MTggMTQ3IDE1NkMxNDcgMTU1IDE0NyAxNTQgMTQ3IDE1NEgxNDdDMTQ3IDE0NC41IDEzNy41IDEzNSAxMjcgMTM1WiIgZmlsbD0iIzhCN0Q2QiIvPgo8L3N2Zz4K';

        // Format price for display (add comma for cents)
        const formattedPrice = this.formatPriceForDisplay(product.price, product.currency);

        card.innerHTML = `
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name}" loading="lazy">
                <div class="product-overlay">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-category">${product.category || 'No category'}</p>
                    <p class="product-price">${formattedPrice}</p>
                    <p class="product-stock">Stock: ${product.stock || 0}</p>
                </div>
            </div>
        `;

        // Add click event to open edit form
        card.addEventListener('click', () => {
            this.openProductEditForm(product);
        });

        return card;
    }

    formatPriceForDisplay(price, currency = 'EUR') {
        if (!price || price === 'N/A') return `${currency} N/A`;
        
        // Convert to number if it's a string
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        
        if (isNaN(numPrice)) return `${currency} N/A`;
        
        // Convert to string and add comma before last two digits
        const priceStr = numPrice.toString();
        if (priceStr.length <= 2) {
            return `${currency} ${priceStr}`;
        }
        
        const formattedPrice = priceStr.slice(0, -2) + ',' + priceStr.slice(-2);
        return `${currency} ${formattedPrice}`;
    }

    openProductEditForm(product) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'product-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Product: ${product.name || 'Untitled'}</h2>
                    <button class="modal-close" id="modalClose">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="productEditForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productName">Product Name</label>
                                <input type="text" id="productName" value="${product.name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="productCategory">Category</label>
                                <select id="productCategory" required>
                                    <option value="">Select Category</option>
                                    ${PRODUCT_CONSTANTS.categories.map(cat => 
                                        `<option value="${cat.value}" ${product.category === cat.value ? 'selected' : ''}>${cat.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="productDescription">Description</label>
                            <textarea id="productDescription" rows="3" required>${product.description || ''}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productPrice">Price (in cents)</label>
                                <input type="number" id="productPrice" step="1" value="${product.price || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="productCurrency">Currency</label>
                                <select id="productCurrency">
                                    ${PRODUCT_CONSTANTS.currencies.map(curr => 
                                        `<option value="${curr.value}" ${product.currency === curr.value ? 'selected' : ''}>${curr.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="productStock">Stock</label>
                                <input type="number" id="productStock" value="${product.stock || 0}" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productStatus">Status</label>
                                <select id="productStatus">
                                    ${PRODUCT_CONSTANTS.statuses.map(status => 
                                        `<option value="${status.value}" ${product.status === status.value ? 'selected' : ''}>${status.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="productMaterial">Material</label>
                                <input type="text" id="productMaterial" value="${product.specs?.material || ''}">
                            </div>
                            <div class="form-group">
                                <label for="productCare">Care Instructions</label>
                                <input type="text" id="productCare" value="${product.specs?.care || ''}">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="productTags">Tags (comma-separated)</label>
                            <input type="text" id="productTags" value="${product.tags ? product.tags.join(', ') : ''}">
                        </div>
                        
                        <div class="form-group">
                            <label>Available Sizes</label>
                            <div class="checkbox-group sizes-group">
                                ${PRODUCT_CONSTANTS.sizes.map(size => {
                                    const isChecked = product.availableSizes && product.availableSizes.includes(size.value);
                                    return `
                                        <label class="checkbox-item">
                                            <input type="checkbox" value="${size.value}" ${isChecked ? 'checked' : ''}>
                                            <span>${size.label}</span>
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Available Colors</label>
                            <div class="checkbox-group colors-group">
                                ${PRODUCT_CONSTANTS.colors.map(color => {
                                    const isChecked = product.availableColors && product.availableColors.includes(color.value);
                                    return `
                                        <label class="checkbox-item">
                                            <input type="checkbox" value="${color.value}" ${isChecked ? 'checked' : ''}>
                                            <span>${color.label}</span>
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="productImages">Image URLs (one per line)</label>
                            <textarea id="productImages" rows="3">${product.images ? product.images.join('\n') : ''}</textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" id="cancelEdit">Cancel</button>
                            <button type="submit" class="btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        const closeBtn = modal.querySelector('#modalClose');
        const cancelBtn = modal.querySelector('#cancelEdit');
        const form = modal.querySelector('#productEditForm');
        const overlay = modal.querySelector('.modal-overlay');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProductChanges(product.id, form);
            closeModal();
        });
    }

    async saveProductChanges(productId, form) {
        const db = window.firebaseServices.db;
        
        try {
            // Collect form data
            const formData = {
                name: form.querySelector('#productName').value,
                category: form.querySelector('#productCategory').value,
                description: form.querySelector('#productDescription').value,
                price: parseFloat(form.querySelector('#productPrice').value),
                currency: form.querySelector('#productCurrency').value,
                stock: parseInt(form.querySelector('#productStock').value),
                status: form.querySelector('#productStatus').value,
                specs: {
                    material: form.querySelector('#productMaterial').value,
                    care: form.querySelector('#productCare').value
                },
                tags: form.querySelector('#productTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
                availableSizes: Array.from(form.querySelectorAll('.sizes-group input[type="checkbox"]:checked')).map(input => input.value),
                availableColors: Array.from(form.querySelectorAll('.colors-group input[type="checkbox"]:checked')).map(input => input.value),
                images: form.querySelector('#productImages').value.split('\n').map(url => url.trim()).filter(url => url),
                updatedAt: new Date()
            };

            // Update product in Firestore
            await db.collection('products').doc(productId).update(formData);
            
            console.log('✅ Product updated successfully');
            this.showSuccess('Product updated successfully!');
            
            // Refresh products list
            await this.fetchProducts();
            
        } catch (error) {
            console.error('❌ Error updating product:', error);
            this.showError('Failed to update product. Please try again.');
        }
    }

    showSuccess(message) {
        // Create success notification
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }

    showAccessDenied(email) {
        const roleBadge = document.getElementById('roleBadge');
        const accessDeniedElement = document.getElementById('accessDenied');
        const productsSection = document.getElementById('productsSection');

        // Hide role badge for denied users
        if (roleBadge) {
            roleBadge.style.display = 'none';
        }

        if (accessDeniedElement) {
            accessDeniedElement.classList.add('show');
        }

        // Hide products section for denied users
        if (productsSection) {
            productsSection.style.display = 'none';
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