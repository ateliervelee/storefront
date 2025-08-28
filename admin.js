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
                
                // Clean up admin data when user signs out
                this.cleanupAdminData();
                
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
        const ordersSection = document.getElementById('ordersSection');

        // Update role badge with user's role from Firebase
        if (roleBadge && adminData.role) {
            roleBadge.textContent = adminData.role;
            roleBadge.style.display = 'inline-block';
        }

        if (accessDeniedElement) {
            accessDeniedElement.classList.remove('show');
        }

        // Show both products and orders sections
        if (productsSection) {
            productsSection.style.display = 'block';
            productsSection.classList.add('active');
        }

        if (ordersSection) {
            ordersSection.style.display = 'block';
            ordersSection.classList.add('active');
        }

        console.log('🎉 Administrator access granted');
        
        // Initialize OrderManager after admin access is confirmed
        if (!window.orderManager) {
            window.orderManager = new OrderManager();
        }
        
        // Load products and orders after admin access is confirmed
        this.loadAdminContent();
    }

    async loadAdminContent() {
        console.log('📦 Loading admin content...');
        await this.fetchProducts();
        this.setupProductActions();
        
        // Load orders if OrderManager is available
        if (window.orderManager) {
            await window.orderManager.loadOrders();
        }
    }

    setupProductActions() {
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                this.openNewProductForm();
            });
        }

        const viewStoreBtn = document.getElementById('viewStoreBtn');
        if (viewStoreBtn) {
            viewStoreBtn.addEventListener('click', () => {
                // Open the main store page in a new tab
                window.open('/', '_blank');
            });
        }
    }

    async fetchProducts() {
        const db = window.firebaseServices.db;
        
        try {
            console.log('🔄 Fetching products with variants from Firestore...');
            
            const productsSnapshot = await db.collection('products').get();
            const products = [];
            
            // Fetch each product with its variants
            for (const productDoc of productsSnapshot.docs) {
                const productData = {
                    id: productDoc.id,
                    ...productDoc.data(),
                    variants: []
                };
                
                // Fetch variants for this product
                const variantsSnapshot = await db.collection('products')
                    .doc(productDoc.id)
                    .collection('variants')
                    .get();
                
                variantsSnapshot.forEach(variantDoc => {
                    productData.variants.push({
                        id: variantDoc.id,
                        ...variantDoc.data()
                    });
                });
                
                products.push(productData);
            }
            
            console.log(`✅ Fetched ${products.length} products with variants`);
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

        // Get first image and build full URL
        const firstImageName = product.images && product.images.length > 0 ? product.images[0] : null;
        const imageUrl = this.buildImageUrl(firstImageName);

        // Calculate aggregate data from variants
        const totalStock = product.variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
        const priceRange = this.calculatePriceRange(product.variants);
        const variantCount = product.variants.length;
        
        // Get unique colors and sizes from variants
        const availableColors = [...new Set(product.variants.map(v => v.color).filter(Boolean))];
        const availableSizes = [...new Set(product.variants.map(v => v.size).filter(Boolean))].sort();
        
        // Generate color circles
        const colorCircles = availableColors.map(color => 
            `<span class="color-circle" data-color="${color}" title="${color}"></span>`
        ).join('');
        
        // Generate sizes list
        const sizesList = availableSizes.join(', ');

        card.innerHTML = `
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name}" loading="lazy">
                <div class="product-overlay">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-category">${product.category || 'No category'}</p>
                    <p class="product-price">${priceRange}</p>
                    <div class="product-colors">
                        <span class="colors-label">Colors:</span>
                        <div class="colors-list">${colorCircles || '<span class="no-colors">No colors</span>'}</div>
                    </div>
                    <div class="product-sizes">
                        <span class="sizes-label">Sizes:</span>
                        <span class="sizes-list">${sizesList || 'No sizes'}</span>
                    </div>
                    <p class="product-stock">Total Stock: ${totalStock}</p>
                </div>
            </div>
        `;

        // Add click event to open edit form
        card.addEventListener('click', () => {
            this.openProductEditForm(product);
        });

        return card;
    }

    calculatePriceRange(variants) {
        if (!variants || variants.length === 0) {
            return 'No variants';
        }

        const prices = variants
            .map(v => v.price)
            .filter(p => p !== undefined && p !== null && !isNaN(p))
            .sort((a, b) => a - b);

        if (prices.length === 0) {
            return 'Price N/A';
        }

        const currency = variants[0].currency || 'USD';
        const formatPrice = (price) => {
            const dollars = Math.floor(price / 100);
            const cents = price % 100;
            return `${currency} ${dollars}.${cents.toString().padStart(2, '0')}`;
        };

        if (prices.length === 1) {
            return formatPrice(prices[0]);
        }

        const minPrice = prices[0];
        const maxPrice = prices[prices.length - 1];

        if (minPrice === maxPrice) {
            return formatPrice(minPrice);
        }

        return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
    }

    renderVariants(variants) {
        if (!variants || variants.length === 0) {
            return '<p class="no-variants">No variants yet. Click "Add New Variant" to create one.</p>';
        }

        return variants.map((variant, index) => this.renderVariantForm(variant, index)).join('');
    }

    renderVariantForm(variant = {}, index = 0) {
        const variantId = variant.id || Date.now().toString();
        
        return `
            <div class="variant-card" data-variant-id="${variantId}">
                <div class="variant-header">
                    <h4>Variant ${index + 1}</h4>
                    <button type="button" class="btn-danger remove-variant" onclick="this.closest('.variant-card').remove()">
                        Remove
                    </button>
                </div>
                <div class="variant-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Size</label>
                            <select name="variant-size" required>
                                <option value="">Select Size</option>
                                ${PRODUCT_CONSTANTS.sizes.map(size => 
                                    `<option value="${size.value}" ${variant.size === size.value ? 'selected' : ''}>${size.label}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Color</label>
                            <select name="variant-color" required>
                                <option value="">Select Color</option>
                                ${PRODUCT_CONSTANTS.colors.map(color => 
                                    `<option value="${color.value}" ${variant.color === color.value ? 'selected' : ''}>${color.label}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>SKU</label>
                            <input type="text" name="variant-sku" value="${variant.sku || ''}" placeholder="Leave empty for auto-generation">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Price (in cents)</label>
                            <input type="number" name="variant-price" step="1" value="${variant.price || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Currency</label>
                            <select name="variant-currency">
                                ${PRODUCT_CONSTANTS.currencies.map(curr => 
                                    `<option value="${curr.value}" ${variant.currency === curr.value ? 'selected' : ''}>${curr.label}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Quantity</label>
                            <input type="number" name="variant-quantity" value="${variant.quantity || 0}" required>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async addVariantToForm() {
        const container = document.getElementById('variantsContainer');
        const noVariantsMsg = container.querySelector('.no-variants');
        
        if (noVariantsMsg) {
            noVariantsMsg.remove();
        }
        
        const existingVariants = container.querySelectorAll('.variant-card');
        const newIndex = existingVariants.length;
        
        // Add small delay to ensure unique timestamps if multiple variants added quickly
        if (newIndex > 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
        }
        
        const variantHtml = this.renderVariantForm({}, newIndex);
        container.insertAdjacentHTML('beforeend', variantHtml);
        
        // Auto-focus on the first input of the new variant
        const newVariant = container.lastElementChild;
        const firstInput = newVariant.querySelector('select[name="variant-size"]');
        if (firstInput) {
            firstInput.focus();
        }
    }

    openProductEditForm(product, isNew = false) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'product-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isNew ? 'Create New Product' : `Edit Product: ${product.name || 'Untitled'}`}</h2>
                    <button class="modal-close" id="modalClose">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="productEditForm">
                        <!-- Product Base Information -->
                        <div class="form-section">
                            <h3>Product Information</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="productName">Product Name</label>
                                    <input type="text" id="productName" value="${product.name || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label for="productSlug">Slug</label>
                                    <input type="text" id="productSlug" value="${product.slug || ''}" required>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="productCategory">Category</label>
                                    <select id="productCategory" required>
                                        <option value="">Select Category</option>
                                        ${PRODUCT_CONSTANTS.categories.map(cat => 
                                            `<option value="${cat.value}" ${product.category === cat.value ? 'selected' : ''}>${cat.label}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="productStatus">Status</label>
                                    <select id="productStatus">
                                        ${PRODUCT_CONSTANTS.statuses.map(status => 
                                            `<option value="${status.value}" ${product.status === status.value ? 'selected' : ''}>${status.label}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="productDescription">Description</label>
                                <textarea id="productDescription" rows="3" required>${product.description || ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="productTags">Tags (comma-separated)</label>
                                <input type="text" id="productTags" value="${product.tags ? product.tags.join(', ') : ''}">
                            </div>
                            
                            <div class="form-group">
                                <label>Product Images</label>
                                <div class="image-gallery-section">
                                    <div class="gallery-search">
                                        <input type="text" id="imageSearch" placeholder="Search images by filename..." class="search-input">
                                    </div>
                                    <div class="selected-images">
                                        <h4>Product Images</h4>
                                        <div id="selectedImagesContainer" class="selected-images-grid">
                                            ${this.renderSelectedImages(product.images || [])}
                                        </div>
                                    </div>
                                    <div class="available-images">
                                        <h4>Image Gallery</h4>
                                        <div id="availableImagesContainer" class="available-images-grid">
                                            <div class="loading-images">Loading images...</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Product Variants -->
                        <div class="form-section">
                            <div class="variants-header">
                                <h3>Product Variants</h3>
                                <button type="button" class="btn-secondary" id="addVariantBtn">Add New Variant</button>
                            </div>
                            <div id="variantsContainer">
                                ${this.renderVariants(product.variants || [])}
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" id="cancelEdit">Cancel</button>
                            <button type="submit" class="btn-primary">${isNew ? 'Create Product' : 'Save Changes'}</button>
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
        const addVariantBtn = modal.querySelector('#addVariantBtn');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // Add variant functionality
        addVariantBtn.addEventListener('click', async () => {
            await this.addVariantToForm();
        });

        // Setup image gallery
        this.setupImageGallery();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            // Set loading state
            this.setFormLoading(form, true);
            
            try {
                if (isNew) {
                    await this.createNewProduct(form);
                } else {
                    await this.saveProductChanges(product.id, form);
                }
                closeModal();
            } catch (error) {
                // Error handling is done in the individual methods
                console.error('Form submission error:', error);
            } finally {
                // Reset loading state
                this.setFormLoading(form, false);
            }
        });
    }

    async saveProductChanges(productId, form) {
        const db = window.firebaseServices.db;
        
        try {
            // Collect product base data
            const productData = {
                name: form.querySelector('#productName').value,
                slug: form.querySelector('#productSlug').value,
                category: form.querySelector('#productCategory').value,
                description: form.querySelector('#productDescription').value,
                status: form.querySelector('#productStatus').value,
                tags: form.querySelector('#productTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
                images: this.getSelectedImageNames(),
                updatedAt: new Date()
            };

            // Collect variants data
            const variantCards = form.querySelectorAll('.variant-card');
            const variants = [];
            
            variantCards.forEach(card => {
                const size = card.querySelector('[name="variant-size"]').value;
                const color = card.querySelector('[name="variant-color"]').value;
                const price = parseInt(card.querySelector('[name="variant-price"]').value);
                const currency = card.querySelector('[name="variant-currency"]').value;
                const quantity = parseInt(card.querySelector('[name="variant-quantity"]').value);
                
                if (size && color && !isNaN(price) && !isNaN(quantity)) {
                    // Use manual SKU or generate if empty
                    let sku = card.querySelector('[name="variant-sku"]').value.trim();
                    if (!sku) {
                        sku = this.generateSKU(productData.name, color, size);
                    }
                    
                    variants.push({
                        id: card.dataset.variantId,
                        size,
                        color,
                        sku,
                        price,
                        currency,
                        quantity,
                        updatedAt: new Date()
                    });
                }
            });

            // Update product in Firestore
            await db.collection('products').doc(productId).update(productData);
            
            // Get existing variants to determine which ones to delete
            const existingVariantsSnapshot = await db.collection('products')
                .doc(productId)
                .collection('variants')
                .get();
            
            const existingVariantIds = existingVariantsSnapshot.docs.map(doc => doc.id);
            const currentVariantIds = variants.map(v => v.id);
            
            // Delete removed variants
            const variantsToDelete = existingVariantIds.filter(id => !currentVariantIds.includes(id));
            for (const variantId of variantsToDelete) {
                await db.collection('products')
                    .doc(productId)
                    .collection('variants')
                    .doc(variantId)
                    .delete();
            }
            
            // Save/update variants
            for (const variant of variants) {
                const variantRef = db.collection('products')
                    .doc(productId)
                    .collection('variants');
                
                if (!existingVariantIds.includes(variant.id)) {
                    // Create new variant with the ID from the form (already Unix timestamp)
                    await variantRef.doc(variant.id).set({
                        ...variant,
                        createdAt: new Date()
                    });
                    console.log(`✅ Created new variant: ${variant.id}`);
                } else {
                    // Update existing variant
                    await variantRef.doc(variant.id).update(variant);
                    console.log(`✅ Updated variant: ${variant.id}`);
                }
            }
            
            console.log('✅ Product and variants updated successfully');
            this.showSuccess('Product and variants updated successfully!');
            
            // Refresh products list
            await this.fetchProducts();
            
        } catch (error) {
            console.error('❌ Error updating product:', error);
            this.showError('Failed to update product. Please try again.');
        }
    }

    generateSKU(productName, color, size) {
        // Generate SKU format: PRODUCT-COLOR-SIZE
        const productCode = productName.substring(0, 3).toUpperCase();
        const colorCode = color.substring(0, 3).toUpperCase();
        const sizeCode = size.toUpperCase();
        
        return `${productCode}-${colorCode}-${sizeCode}`;
    }

    buildImageUrl(imageName) {
        // If imageName is already a full URL, return as-is
        if (imageName && (imageName.startsWith('http://') || imageName.startsWith('https://'))) {
            return imageName;
        }
        
        // If imageName is empty or undefined, return placeholder
        if (!imageName) {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU0IiBoZWlnaHQ9IjI1NCIgdmlld0JveD0iMCAwIDI1NCAyNTQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTQiIGhlaWdodD0iMjU0IiBmaWxsPSIjRThFM0Q4Ii8+CjxwYXRoIGQ9Ik0xMjcgMTI3QzEzMS40MTggMTI3IDEzNSAxMjMuNDE4IDEzNSAxMTlDMTM1IDExNC41ODE3IDQ0LjQxODMgMjQgMTI3IDExMUMxMjIuNTgyIDExMSAxMTkgMTE0LjU4MiAxMTkgMTE5QzExOSAxMjMuNDE4IDEyMi41ODIgMTI3IDEyNyAxMjdaIiBmaWxsPSIjOEI3RDZCIi8+CjxwYXRoIGQ9Ik0xMjcgMTM1QzExNi41IDEzNSAxMDcgMTQ0LjUgMTA3IDE1NEgxMDdDMTEwIDE1NCAxMTAgMTU1IDExMCAxNTZDMTA3IDE2MC40MTggMTEwLjU4MiAxNjQgMTE1IDE2NEgxMzlDMTQzLjQxOCAxNjQgMTQ3IDE2MC40MTggMTQ3IDE1NkMxNDcgMTU1IDE0NyAxNTQgMTQ3IDE1NEgxNDdDMTQ3IDE0NC41IDEzNy41IDEzNSAxMjcgMTM1WiIgZmlsbD0iIzhCN0Q2QiIvPgo8L3N2Zz4K';
        }
        
        // Build full URL from base + filename
        return PRODUCT_CONSTANTS.imageBaseUrl + imageName;
    }

    renderSelectedImages(selectedImages) {
        if (!selectedImages || selectedImages.length === 0) {
            return '<div class="no-images">No images selected</div>';
        }
        
        return selectedImages.map(imageName => `
            <div class="selected-image-item" data-image="${imageName}">
                <button type="button" class="preview-btn" onclick="previewImage('${imageName}')" title="Preview image">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </button>
                <img src="${this.buildImageUrl(imageName)}" alt="${imageName}" loading="lazy">
                <div class="image-overlay">
                    <span class="image-name">${imageName}</span>
                    <button type="button" class="remove-image-btn" onclick="removeSelectedImage('${imageName}')">×</button>
                </div>
            </div>
        `).join('');
    }

    async loadAvailableImages() {
        try {
            console.log('🖼️ Loading available images...');
            
            const response = await fetch(PRODUCT_CONSTANTS.imageIndexUrl);
            if (!response.ok) {
                throw new Error(`Failed to load images: ${response.status}`);
            }
            
            const imageList = await response.json();
            console.log(`✅ Loaded ${imageList.length} available images`);
            
            this.availableImages = imageList;
            this.displayAvailableImages(imageList);
            
        } catch (error) {
            console.error('❌ Error loading images:', error);
            const container = document.getElementById('availableImagesContainer');
            if (container) {
                container.innerHTML = '<div class="error-loading">Failed to load images. Please try again.</div>';
            }
        }
    }

    displayAvailableImages(imageList, filter = '') {
        const container = document.getElementById('availableImagesContainer');
        if (!container) return;
        
        const filteredImages = imageList.filter(imageName => 
            imageName.toLowerCase().includes(filter.toLowerCase())
        );
        
        if (filteredImages.length === 0) {
            container.innerHTML = '<div class="no-images">No images found</div>';
            return;
        }
        
        const selectedImages = this.getSelectedImageNames();
        
        container.innerHTML = filteredImages.map(imageName => {
            const isSelected = selectedImages.includes(imageName);
            return `
                <div class="available-image-item ${isSelected ? 'selected' : ''}" data-image="${imageName}">
                    <button type="button" class="preview-btn" onclick="previewImage('${imageName}')" title="Preview image">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <img src="${this.buildImageUrl(imageName)}" alt="${imageName}" loading="lazy">
                    <div class="image-overlay">
                        <span class="image-name">${imageName}</span>
                        <button type="button" class="select-image-btn ${isSelected ? 'selected' : ''}" onclick="toggleImageSelection('${imageName}')">
                            ${isSelected ? '✓ Selected' : '+ Select'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getSelectedImageNames() {
        const selectedContainer = document.getElementById('selectedImagesContainer');
        if (!selectedContainer) return [];
        
                 return Array.from(selectedContainer.querySelectorAll('.selected-image-item'))
             .map(item => item.dataset.image);
     }

     setupImageGallery() {
         // Load available images
         this.loadAvailableImages();
         
         // Setup search functionality
         const searchInput = document.getElementById('imageSearch');
         if (searchInput) {
             searchInput.addEventListener('input', (e) => {
                 if (this.availableImages) {
                     this.displayAvailableImages(this.availableImages, e.target.value);
                 }
             });
         }
         
                 // Make methods globally accessible for onclick handlers
        window.toggleImageSelection = (imageName) => {
            this.toggleImageSelection(imageName);
        };
        
        window.removeSelectedImage = (imageName) => {
            this.removeSelectedImage(imageName);
        };
        
        window.previewImage = (imageName) => {
            this.previewImage(imageName);
        };
     }

     toggleImageSelection(imageName) {
         const selectedImages = this.getSelectedImageNames();
         const isSelected = selectedImages.includes(imageName);
         
         if (isSelected) {
             this.removeSelectedImage(imageName);
         } else {
             this.addSelectedImage(imageName);
         }
         
         // Refresh available images to update button states
         if (this.availableImages) {
             const searchInput = document.getElementById('imageSearch');
             const filter = searchInput ? searchInput.value : '';
             this.displayAvailableImages(this.availableImages, filter);
         }
     }

     addSelectedImage(imageName) {
         const selectedContainer = document.getElementById('selectedImagesContainer');
         if (!selectedContainer) return;
         
         // Remove "no images" message if present
         const noImagesMsg = selectedContainer.querySelector('.no-images');
         if (noImagesMsg) {
             noImagesMsg.remove();
         }
         
                 // Add new selected image
        const imageHtml = `
            <div class="selected-image-item" data-image="${imageName}">
                <button type="button" class="preview-btn" onclick="previewImage('${imageName}')" title="Preview image">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </button>
                <img src="${this.buildImageUrl(imageName)}" alt="${imageName}" loading="lazy">
                <div class="image-overlay">
                    <span class="image-name">${imageName}</span>
                    <button type="button" class="remove-image-btn" onclick="removeSelectedImage('${imageName}')">×</button>
                </div>
            </div>
        `;
         
         selectedContainer.insertAdjacentHTML('beforeend', imageHtml);
     }

     removeSelectedImage(imageName) {
         const selectedContainer = document.getElementById('selectedImagesContainer');
         if (!selectedContainer) return;
         
         const imageItem = selectedContainer.querySelector(`[data-image="${imageName}"]`);
         if (imageItem) {
             imageItem.remove();
         }
         
         // Show "no images" message if container is empty
         if (selectedContainer.children.length === 0) {
             selectedContainer.innerHTML = '<div class="no-images">No images selected</div>';
         }
         
         // Refresh available images to update button states
         if (this.availableImages) {
             const searchInput = document.getElementById('imageSearch');
             const filter = searchInput ? searchInput.value : '';
             this.displayAvailableImages(this.availableImages, filter);
         }
     }

    setFormLoading(form, isLoading) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const cancelBtn = form.querySelector('#cancelEdit');
        const inputs = form.querySelectorAll('input, select, textarea');
        
        if (isLoading) {
            // Store original button text
            if (!submitBtn.dataset.originalText) {
                submitBtn.dataset.originalText = submitBtn.textContent;
            }
            
            // Disable form interactions
            submitBtn.disabled = true;
            cancelBtn.disabled = true;
            inputs.forEach(input => input.disabled = true);
            
            // Add spinner to the left of text
            submitBtn.innerHTML = `<span class="loading-spinner"></span> ${submitBtn.dataset.originalText}`;
            submitBtn.classList.add('loading');
            
        } else {
            // Re-enable form interactions
            submitBtn.disabled = false;
            cancelBtn.disabled = false;
            inputs.forEach(input => input.disabled = false);
            
            // Restore original button text
            submitBtn.textContent = submitBtn.dataset.originalText || 'Save Changes';
            submitBtn.classList.remove('loading');
            delete submitBtn.dataset.originalText;
        }
    }

    openNewProductForm() {
        // Create a new empty product
        const newProduct = {
            id: null,
            name: '',
            slug: '',
            category: '',
            description: '',
            status: 'draft',
            tags: [],
            images: [],
            variants: []
        };

        this.openProductEditForm(newProduct, true);
    }

    async createNewProduct(form) {
        const db = window.firebaseServices.db;
        
        try {
            // Collect product base data
            const productData = {
                name: form.querySelector('#productName').value,
                slug: form.querySelector('#productSlug').value,
                category: form.querySelector('#productCategory').value,
                description: form.querySelector('#productDescription').value,
                status: form.querySelector('#productStatus').value,
                tags: form.querySelector('#productTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
                images: this.getSelectedImageNames(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Generate Unix timestamp ID for product
            const productId = Date.now().toString();
            
            // Create product in Firestore with custom ID
            await db.collection('products').doc(productId).set(productData);
            
            console.log(`✅ Created new product: ${productId}`);

            // Collect and save variants
            const variantCards = form.querySelectorAll('.variant-card');
            const variants = [];
            
            for (const card of variantCards) {
                const size = card.querySelector('[name="variant-size"]').value;
                const color = card.querySelector('[name="variant-color"]').value;
                const price = parseInt(card.querySelector('[name="variant-price"]').value);
                const currency = card.querySelector('[name="variant-currency"]').value;
                const quantity = parseInt(card.querySelector('[name="variant-quantity"]').value);
                
                if (size && color && !isNaN(price) && !isNaN(quantity)) {
                    // Use manual SKU or generate if empty
                    let sku = card.querySelector('[name="variant-sku"]').value.trim();
                    if (!sku) {
                        sku = this.generateSKU(productData.name, color, size);
                    }
                    
                    const variantData = {
                        size,
                        color,
                        sku,
                        price,
                        currency,
                        quantity,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    // Generate Unix timestamp ID for variant
                    const variantId = Date.now().toString();
                    // Add small delay to ensure unique timestamps
                    await new Promise(resolve => setTimeout(resolve, 1));
                    
                    await db.collection('products')
                        .doc(productId)
                        .collection('variants')
                        .doc(variantId)
                        .set(variantData);
                    
                    console.log(`✅ Created variant: ${variantId}`);
                }
            }
            
            this.showSuccess('Product created successfully!');
            
            // Refresh products list
            await this.fetchProducts();
            
        } catch (error) {
            console.error('❌ Error creating product:', error);
            this.showError('Failed to create product. Please try again.');
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

    cleanupAdminData() {
        console.log('🧹 Cleaning up admin data...');
        
        // Hide admin sections
        const productsSection = document.getElementById('productsSection');
        const imageGallery = document.getElementById('imageGallery');
        const userHeader = document.getElementById('userHeader');
        const accessDenied = document.getElementById('accessDenied');
        
        if (productsSection) {
            productsSection.style.display = 'none';
        }
        
        if (imageGallery) {
            imageGallery.style.display = 'none';
        }
        
        if (userHeader) {
            userHeader.style.display = 'none';
        }
        
        if (accessDenied) {
            accessDenied.classList.remove('show');
        }
        
        // Clear products data
        const productsContainer = document.getElementById('productsContainer');
        if (productsContainer) {
            productsContainer.innerHTML = '';
        }
        
        // Clear gallery data
        const galleryContainer = document.getElementById('galleryContainer');
        if (galleryContainer) {
            galleryContainer.innerHTML = '';
        }
        
        // Clear role badge
        const roleBadge = document.getElementById('roleBadge');
        if (roleBadge) {
            roleBadge.textContent = '';
            roleBadge.style.display = 'none';
        }
        
        console.log('✅ Admin data cleaned up');
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

    previewImage(imageName) {
        // Create modal overlay for image preview
        const modal = document.createElement('div');
        modal.className = 'image-preview-modal';
        modal.innerHTML = `
            <div class="preview-overlay" onclick="this.closest('.image-preview-modal').remove()"></div>
            <div class="preview-content">
                <div class="preview-header">
                    <h3>${imageName}</h3>
                    <button class="preview-close" onclick="this.closest('.image-preview-modal').remove()">×</button>
                </div>
                <div class="preview-image-container">
                    <img src="${this.buildImageUrl(imageName)}" alt="${imageName}" class="preview-image">
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Animate in
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }
}

// Order Management Class
class OrderManager {
    constructor() {
        this.db = window.firebaseServices?.db;
        this.orders = [];
        this.filteredOrders = [];
        this.currentEditOrder = null;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 0;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('orderSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterOrders(e.target.value);
            });
        }

        // Order edit dialog
        const orderDialogClose = document.getElementById('orderDialogClose');
        const orderDialogCancel = document.getElementById('orderDialogCancel');
        const orderForm = document.getElementById('orderForm');
        const sameAsBillingCheckbox = document.getElementById('sameAsBillingCheckbox');

        if (orderDialogClose) {
            orderDialogClose.addEventListener('click', () => this.closeOrderDialog());
        }

        if (orderDialogCancel) {
            orderDialogCancel.addEventListener('click', () => this.closeOrderDialog());
        }

        if (orderForm) {
            orderForm.addEventListener('submit', (e) => this.handleOrderSave(e));
        }

        if (sameAsBillingCheckbox) {
            sameAsBillingCheckbox.addEventListener('change', (e) => {
                this.toggleShippingFields(e.target.checked);
            });
        }

        // Close dialog on overlay click
        const orderDialogOverlay = document.getElementById('orderDialogOverlay');
        if (orderDialogOverlay) {
            orderDialogOverlay.addEventListener('click', (e) => {
                if (e.target === orderDialogOverlay) {
                    this.closeOrderDialog();
                }
            });
        }

        // Pagination event listeners
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        }
    }

    async loadOrders() {
        const loading = document.getElementById('ordersLoading');
        const error = document.getElementById('ordersError');
        const container = document.getElementById('ordersContainer');

        try {
            this.showOrdersLoading(true);
            this.hideOrdersError();

            if (!this.db) {
                throw new Error('Database not available');
            }

            const ordersCollection = this.db.collection('orders');
            const snapshot = await ordersCollection.orderBy('createdAt', 'desc').get();

            this.orders = [];
            snapshot.forEach(doc => {
                this.orders.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.filteredOrders = [...this.orders];
            this.currentPage = 1; // Reset to first page
            this.renderOrders();

        } catch (error) {
            console.error('Error loading orders:', error);
            this.showOrdersError('Failed to load orders. Please try again.');
        } finally {
            this.showOrdersLoading(false);
        }
    }

    filterOrders(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredOrders = [...this.orders];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredOrders = this.orders.filter(order => {
                return (
                    order.id.toLowerCase().includes(term) ||
                    order.customerEmail?.toLowerCase().includes(term) ||
                    order.status?.toLowerCase().includes(term) ||
                    order.paymentStatus?.toLowerCase().includes(term) ||
                    order.stripeSessionId?.toLowerCase().includes(term)
                );
            });
        }
        // Reset to first page when filtering
        this.currentPage = 1;
        this.renderOrders();
    }

    renderOrders() {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        if (this.filteredOrders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: var(--deep-taupe);">
                        ${this.orders.length === 0 ? 'No orders found.' : 'No orders match your search.'}
                    </td>
                </tr>
            `;
            this.hidePagination();
            return;
        }

        // Calculate pagination
        this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageOrders = this.filteredOrders.slice(startIndex, endIndex);

        tbody.innerHTML = pageOrders.map(order => {
            const orderDate = order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : 'N/A';
            const total = order.total ? `€${(order.total / 100).toFixed(2)}` : 'N/A';
            
            return `
                <tr>
                    <td>
                        <span class="order-id">${order.orderNumber || order.id}</span>
                    </td>
                    <td>
                        <div class="order-customer">${order.customerEmail || 'N/A'}</div>
                    </td>
                    <td class="order-date">${orderDate}</td>
                    <td class="order-total">${total}</td>
                    <td>
                        <span class="order-status ${(order.status || '').replace('_', '-')}">${this.getStatusLabel(order.status)}</span>
                    </td>
                    <td>
                        <span class="payment-status ${order.paymentStatus || ''}">${this.getPaymentStatusLabel(order.paymentStatus)}</span>
                    </td>
                    <td>
                        <div class="order-actions">
                            <button class="action-btn" onclick="window.orderManager.editOrder('${order.id}')">Edit</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.updatePagination();
    }

    getStatusLabel(status) {
        const statusObj = PRODUCT_CONSTANTS.orderStatuses.find(s => s.value === status);
        return statusObj ? statusObj.label : status || 'Unknown';
    }

    getPaymentStatusLabel(status) {
        const statusObj = PRODUCT_CONSTANTS.paymentStatuses.find(s => s.value === status);
        return statusObj ? statusObj.label : status || 'Unknown';
    }

    editOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        this.currentEditOrder = order;
        this.populateOrderForm(order);
        this.showOrderDialog();
    }

    populateOrderForm(order) {
        // Populate status dropdowns
        this.populateStatusDropdowns();

        // Order information
        document.getElementById('orderIdInput').value = order.orderNumber || order.id;
        
        // Format date for datetime-local input
        if (order.createdAt) {
            const date = new Date(order.createdAt.toDate());
            const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString().slice(0, 16);
            document.getElementById('orderDateInput').value = localDateTime;
        }

        document.getElementById('orderStatusSelect').value = order.status || '';
        document.getElementById('paymentStatusSelect').value = order.paymentStatus || '';
        document.getElementById('trackingLinkInput').value = order.trackingLink || '';

        // Customer information
        document.getElementById('customerEmailInput').value = order.customerEmail || '';
        document.getElementById('customerPhoneInput').value = order.billing?.phone || '';

        // Billing address
        const billing = order.billing || {};
        document.getElementById('billingEmailInput').value = billing.email || '';
        document.getElementById('billingFirstNameInput').value = billing.firstName || '';
        document.getElementById('billingLastNameInput').value = billing.lastName || '';
        document.getElementById('billingPhoneInput').value = billing.phone || '';
        document.getElementById('billingAddressInput').value = billing.address || '';
        document.getElementById('billingAddressDetailsInput').value = billing.addressDetails || '';
        document.getElementById('billingCityInput').value = billing.city || '';
        document.getElementById('billingPostcodeInput').value = billing.postcode || '';
        document.getElementById('billingCountryInput').value = billing.country || '';

        // Shipping address
        const shipping = order.shipping || {};
        const sameAsBilling = this.isSameAddress(billing, shipping);
        document.getElementById('sameAsBillingCheckbox').checked = sameAsBilling;
        this.toggleShippingFields(sameAsBilling);

        if (!sameAsBilling) {
            document.getElementById('shippingEmailInput').value = shipping.email || '';
            document.getElementById('shippingFirstNameInput').value = shipping.firstName || '';
            document.getElementById('shippingLastNameInput').value = shipping.lastName || '';
            document.getElementById('shippingPhoneInput').value = shipping.phone || '';
            document.getElementById('shippingAddressInput').value = shipping.address || '';
            document.getElementById('shippingAddressDetailsInput').value = shipping.addressDetails || '';
            document.getElementById('shippingCityInput').value = shipping.city || '';
            document.getElementById('shippingPostcodeInput').value = shipping.postcode || '';
            document.getElementById('shippingCountryInput').value = shipping.country || '';
        }

        // Order totals
        document.getElementById('orderTotalInput').value = order.total ? (order.total / 100).toFixed(2) : '';
        document.getElementById('orderTaxInput').value = order.tax ? (order.tax / 100).toFixed(2) : '0';

        // Order items
        this.renderOrderItems(order.items || []);
    }

    populateStatusDropdowns() {
        const orderStatusSelect = document.getElementById('orderStatusSelect');
        const paymentStatusSelect = document.getElementById('paymentStatusSelect');

        // Populate order status
        orderStatusSelect.innerHTML = PRODUCT_CONSTANTS.orderStatuses.map(status => 
            `<option value="${status.value}">${status.label}</option>`
        ).join('');

        // Populate payment status
        paymentStatusSelect.innerHTML = PRODUCT_CONSTANTS.paymentStatuses.map(status => 
            `<option value="${status.value}">${status.label}</option>`
        ).join('');
    }

    isSameAddress(billing, shipping) {
        return (
            billing.email === shipping.email &&
            billing.firstName === shipping.firstName &&
            billing.lastName === shipping.lastName &&
            billing.phone === shipping.phone &&
            billing.address === shipping.address &&
            billing.addressDetails === shipping.addressDetails &&
            billing.city === shipping.city &&
            billing.postcode === shipping.postcode &&
            billing.country === shipping.country
        );
    }

    toggleShippingFields(hide) {
        const shippingFields = document.getElementById('shippingAddressFields');
        if (shippingFields) {
            shippingFields.style.display = hide ? 'none' : 'block';
        }
    }

    renderOrderItems(items) {
        const container = document.getElementById('orderItemsList');
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = '<p style="color: var(--deep-taupe); font-style: italic;">No items in this order.</p>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div style="border: 1px solid var(--soft-beige); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: var(--warm-white);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <div style="margin-bottom: 0.5rem;">
                            <strong style="font-size: 1.1rem;">${item.productName || 'Unknown Product'}</strong>
                        </div>
                        <div style="color: var(--deep-taupe); font-size: 0.9rem;">
                            <div><strong>Size:</strong> ${item.size || 'N/A'}</div>
                            <div><strong>Color:</strong> ${item.color || 'N/A'}</div>
                            <div><strong>Quantity:</strong> ${item.quantity || 1}</div>
                        </div>
                    </div>
                    <div>
                        <div style="color: var(--deep-taupe); font-size: 0.9rem;">
                            <div><strong>Price:</strong> €${item.unitPrice ? (item.unitPrice / 100).toFixed(2) : '0.00'}</div>
                            <div><strong>Variant ID:</strong> ${item.variantId || 'N/A'}</div>
                            <div><strong>SKU:</strong> ${item.variantSku || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async handleOrderSave(e) {
        e.preventDefault();

        if (!this.currentEditOrder) return;

        try {
            const formData = new FormData(e.target);
            const updatedOrder = this.buildOrderFromForm();

            await this.db.collection('orders').doc(this.currentEditOrder.id).update(updatedOrder);

            this.closeOrderDialog();
            this.loadOrders(); // Reload orders
            this.showSuccess('Order updated successfully!');

        } catch (error) {
            console.error('Error updating order:', error);
            this.showError('Failed to update order. Please try again.');
        }
    }

    buildOrderFromForm() {
        return {
            status: document.getElementById('orderStatusSelect').value,
            paymentStatus: document.getElementById('paymentStatusSelect').value,
            trackingLink: document.getElementById('trackingLinkInput').value,
            customerEmail: document.getElementById('customerEmailInput').value,
            billing: {
                email: document.getElementById('billingEmailInput').value,
                firstName: document.getElementById('billingFirstNameInput').value,
                lastName: document.getElementById('billingLastNameInput').value,
                phone: document.getElementById('billingPhoneInput').value,
                address: document.getElementById('billingAddressInput').value,
                addressDetails: document.getElementById('billingAddressDetailsInput').value,
                city: document.getElementById('billingCityInput').value,
                postcode: document.getElementById('billingPostcodeInput').value,
                country: document.getElementById('billingCountryInput').value
            },
            shipping: document.getElementById('sameAsBillingCheckbox').checked ? 
                {
                    email: document.getElementById('billingEmailInput').value,
                    firstName: document.getElementById('billingFirstNameInput').value,
                    lastName: document.getElementById('billingLastNameInput').value,
                    phone: document.getElementById('billingPhoneInput').value,
                    address: document.getElementById('billingAddressInput').value,
                    addressDetails: document.getElementById('billingAddressDetailsInput').value,
                    city: document.getElementById('billingCityInput').value,
                    postcode: document.getElementById('billingPostcodeInput').value,
                    country: document.getElementById('billingCountryInput').value
                } : {
                    email: document.getElementById('shippingEmailInput').value,
                    firstName: document.getElementById('shippingFirstNameInput').value,
                    lastName: document.getElementById('shippingLastNameInput').value,
                    phone: document.getElementById('shippingPhoneInput').value,
                    address: document.getElementById('shippingAddressInput').value,
                    addressDetails: document.getElementById('shippingAddressDetailsInput').value,
                    city: document.getElementById('shippingCityInput').value,
                    postcode: document.getElementById('shippingPostcodeInput').value,
                    country: document.getElementById('shippingCountryInput').value
                },
            total: Math.round(parseFloat(document.getElementById('orderTotalInput').value) * 100),
            tax: Math.round(parseFloat(document.getElementById('orderTaxInput').value) * 100),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
    }

    showOrderDialog() {
        const overlay = document.getElementById('orderDialogOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeOrderDialog() {
        const overlay = document.getElementById('orderDialogOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
        this.currentEditOrder = null;
    }

    showOrdersLoading(show) {
        const loading = document.getElementById('ordersLoading');
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
    }

    hideOrdersError() {
        const error = document.getElementById('ordersError');
        if (error) {
            error.style.display = 'none';
        }
    }

    showOrdersError(message) {
        const error = document.getElementById('ordersError');
        if (error) {
            error.textContent = message;
            error.style.display = 'block';
        }
    }

    showSuccess(message) {
        // Create a simple success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d4edda;
            color: #155724;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            border: 1px solid #c3e6cb;
            z-index: 10000;
            font-family: var(--font-sans);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        // Create a simple error notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            border: 1px solid #f5c6cb;
            z-index: 10000;
            font-family: var(--font-sans);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Pagination methods
    updatePagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        const paginationInfo = document.getElementById('paginationInfo');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const paginationNumbers = document.getElementById('paginationNumbers');

        if (!paginationContainer) return;

        // Show pagination
        paginationContainer.style.display = 'flex';

        // Update info
        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, this.filteredOrders.length);
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${this.filteredOrders.length} orders`;
        }

        // Update buttons
        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage <= 1;
        }
        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage >= this.totalPages;
        }

        // Update page numbers
        if (paginationNumbers) {
            this.renderPageNumbers();
        }
    }

    hidePagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
    }

    renderPageNumbers() {
        const paginationNumbers = document.getElementById('paginationNumbers');
        if (!paginationNumbers) return;

        let pages = [];
        const maxVisible = 5;

        if (this.totalPages <= maxVisible) {
            // Show all pages
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show smart pagination
            let start = Math.max(1, this.currentPage - 2);
            let end = Math.min(this.totalPages, start + maxVisible - 1);

            if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }

        paginationNumbers.innerHTML = pages.map(page => 
            `<button class="page-number ${page === this.currentPage ? 'active' : ''}" 
                     onclick="window.orderManager.goToPage(${page})">${page}</button>`
        ).join('');
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }
        
        this.currentPage = page;
        this.renderOrders();
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
}); 