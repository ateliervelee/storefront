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
        this.setupProductActions();
    }

    setupProductActions() {
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                this.openNewProductForm();
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

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
}); 