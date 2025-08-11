class ShoppingCart {
    constructor() {
        this.cart = this.loadCart();
        this.cartIcon = document.getElementById('cartIcon');
        this.cartCount = document.getElementById('cartCount');
        this.cartDrawer = document.getElementById('cartDrawer');
        this.cartClose = document.getElementById('cartClose');
        this.cartItems = document.getElementById('cartItems');
        this.cartEmpty = document.getElementById('cartEmpty');
        this.cartFooter = document.getElementById('cartFooter');
        this.cartTotalPrice = document.getElementById('cartTotalPrice');
        this.continueShoppingBtn = document.getElementById('continueShoppingBtn');
        this.clearCartBtn = document.getElementById('clearCartBtn');
        
        this.initializeCart();
        this.bindEvents();
    }

    initializeCart() {
        this.updateCartDisplay();
        console.log('🛒 Shopping cart initialized with', this.cart.length, 'items');
    }

    bindEvents() {
        // Listen for cart icon clicks to open drawer
        if (this.cartIcon) {
            this.cartIcon.addEventListener('click', () => {
                this.openCartDrawer();
            });
        }

        // Listen for cart close button
        if (this.cartClose) {
            this.cartClose.addEventListener('click', () => {
                this.closeCartDrawer();
            });
        }

        // Listen for continue shopping button
        if (this.continueShoppingBtn) {
            this.continueShoppingBtn.addEventListener('click', () => {
                this.closeCartDrawer();
            });
        }

        // Listen for clear cart button
        if (this.clearCartBtn) {
            this.clearCartBtn.addEventListener('click', () => {
                this.confirmAndClearCart();
            });
        }

        // Note: Removed click outside to close functionality per user request
        // Cart now only closes on X button, clear cart, or continue shopping

        // Listen for product availability updates
        window.addEventListener('productsLoaded', () => {
            this.validateCartItems();
        });

        // Note: Removed automatic cart updates to prevent closing drawer
        // Cart drawer updates only when explicitly opened
    }

    // Load cart from localStorage with fallback
    loadCart() {
        try {
            const savedCart = localStorage.getItem('ateliervelee_cart');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            console.warn('Error loading cart from localStorage:', error);
            return [];
        }
    }

    // Save cart to localStorage
    saveCart() {
        try {
            localStorage.setItem('ateliervelee_cart', JSON.stringify(this.cart));
        } catch (error) {
            console.warn('Error saving cart to localStorage:', error);
        }
    }

    // Add item to cart
    addToCart(productId, variantId, quantity = 1, productData = null, variantData = null) {
        // Get product data if not provided
        if (!productData || !variantData) {
            const product = this.getProductById(productId);
            if (!product) {
                console.error('Product not found when adding to cart:', productId);
                return;
            }
            const variant = product.variants?.find(v => v.id === variantId);
            if (!variant) {
                console.error('Variant not found when adding to cart:', variantId);
                return;
            }
            productData = product;
            variantData = variant;
        }

        // Check if item already exists in cart
        const existingItemIndex = this.cart.findIndex(
            item => item.productId === productId && item.variantId === variantId
        );

        if (existingItemIndex > -1) {
            // Update quantity if item exists
            this.cart[existingItemIndex].quantity += quantity;
        } else {
            // Add new item with complete product information
            this.cart.push({
                productId,
                variantId,
                quantity,
                addedAt: Date.now(),
                // Store complete product information for offline access
                product: {
                    id: productData.id,
                    name: productData.name,
                    images: productData.images || []
                },
                variant: {
                    id: variantData.id,
                    size: variantData.size,
                    color: variantData.color,
                    price: variantData.price,
                    currency: variantData.currency,
                    quantity: variantData.quantity // Available stock
                }
            });
        }

        this.saveCart();
        this.updateCartDisplay();
        this.animateCartIcon();

        console.log('✅ Added to cart:', { productId, variantId, quantity });
        
        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: { action: 'add', productId, variantId, quantity }
        }));
    }

    // Remove item from cart
    removeFromCart(productId, variantId) {
        this.cart = this.cart.filter(
            item => !(item.productId === productId && item.variantId === variantId)
        );

        this.saveCart();
        this.updateCartDisplay();

        console.log('🗑️ Removed from cart:', { productId, variantId });
        
        window.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: { action: 'remove', productId, variantId }
        }));
    }

    // Update item quantity
    updateQuantity(productId, variantId, newQuantity) {
        if (newQuantity <= 0) {
            this.removeFromCart(productId, variantId);
            return;
        }

        const itemIndex = this.cart.findIndex(
            item => item.productId === productId && item.variantId === variantId
        );

        if (itemIndex > -1) {
            this.cart[itemIndex].quantity = newQuantity;
            this.saveCart();
            this.updateCartDisplay();

            window.dispatchEvent(new CustomEvent('cartUpdated', {
                detail: { action: 'update', productId, variantId, quantity: newQuantity }
            }));
        }
    }

    // Get total item count
    getTotalCount() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    // Get total price (requires product data)
    async getTotalPrice(productsData) {
        let total = 0;
        
        for (const cartItem of this.cart) {
            const product = productsData?.find(p => p.id === cartItem.productId);
            if (product) {
                const variant = product.variants?.find(v => v.id === cartItem.variantId);
                if (variant) {
                    total += variant.price * cartItem.quantity;
                }
            }
        }
        
        return total;
    }

    // Update cart display in UI
    updateCartDisplay() {
        const totalCount = this.getTotalCount();
        
        if (this.cartCount) {
            this.cartCount.textContent = totalCount;
            
            if (totalCount > 0) {
                this.cartCount.classList.add('visible');
            } else {
                this.cartCount.classList.remove('visible');
            }
        }

        // Update drawer if it's open (manual refresh)
        if (this.cartDrawer && this.cartDrawer.classList.contains('open')) {
            this.renderCartDrawer();
        }
    }

    // Animate cart icon when item is added
    animateCartIcon() {
        if (this.cartCount) {
            this.cartCount.classList.remove('animate');
            // Force reflow
            this.cartCount.offsetHeight;
            this.cartCount.classList.add('animate');
            
            // Remove animation class after animation completes
            setTimeout(() => {
                this.cartCount.classList.remove('animate');
            }, 600);
        }

        if (this.cartIcon) {
            this.cartIcon.style.transform = 'scale(1.1)';
            setTimeout(() => {
                this.cartIcon.style.transform = '';
            }, 200);
        }
    }

    // Validate cart items against current product availability
    async validateCartItems() {
        if (!window.productsManager || !window.productsManager.products) {
            return;
        }

        const products = window.productsManager.products;
        let itemsRemoved = 0;

        // Check each cart item
        this.cart = this.cart.filter(cartItem => {
            const product = products.find(p => p.id === cartItem.productId);
            
            if (!product) {
                itemsRemoved++;
                console.warn('🚫 Product no longer available, removing from cart:', cartItem.productId);
                return false;
            }

            const variant = product.variants?.find(v => v.id === cartItem.variantId);
            
            if (!variant) {
                itemsRemoved++;
                console.warn('🚫 Variant no longer available, removing from cart:', cartItem.variantId);
                return false;
            }

            // Check if quantity exceeds available stock
            if (cartItem.quantity > variant.quantity) {
                console.warn('📦 Adjusting cart quantity due to limited stock:', {
                    productId: cartItem.productId,
                    variantId: cartItem.variantId,
                    requested: cartItem.quantity,
                    available: variant.quantity
                });
                cartItem.quantity = variant.quantity;
            }

            return true;
        });

        if (itemsRemoved > 0) {
            this.saveCart();
            this.updateCartDisplay();
            
            // Optionally show notification to user
            console.log(`🧹 Cleaned up cart: ${itemsRemoved} unavailable items removed`);
        }
    }

    // Open cart drawer
    openCartDrawer() {
        if (this.cartDrawer) {
            this.cartDrawer.classList.add('open');
            this.renderCartDrawer();
            console.log('🛒 Cart drawer opened');
        }
    }

    // Close cart drawer
    closeCartDrawer() {
        if (this.cartDrawer) {
            this.cartDrawer.classList.remove('open');
            console.log('🛒 Cart drawer closed');
        }
    }

    // Render cart drawer content
    renderCartDrawer() {
        if (!this.cartItems || !this.cartEmpty || !this.cartFooter) {
            console.warn('🚫 Cart drawer elements not found');
            return;
        }

        if (this.cart.length === 0) {
            this.cartItems.style.display = 'none';
            this.cartEmpty.style.display = 'flex';
            this.cartFooter.style.display = 'none';
            return;
        }

        this.cartItems.style.display = 'flex';
        this.cartEmpty.style.display = 'none';
        this.cartFooter.style.display = 'block';

        // Render cart items
        this.cartItems.innerHTML = '';
        
        this.cart.forEach(cartItem => {
            // Use stored product data if available, otherwise try to fetch
            let product, variant;
            
            if (cartItem.product && cartItem.variant) {
                // Use stored data (preferred)
                product = cartItem.product;
                variant = cartItem.variant;
            } else {
                // Fallback to fetching (for old cart items)
                product = this.getProductById(cartItem.productId);
                if (!product) {
                    console.warn('❌ Product not found:', cartItem.productId);
                    return;
                }

                variant = product.variants?.find(v => v.id === cartItem.variantId);
                if (!variant) {
                    console.warn('❌ Variant not found:', cartItem.variantId);
                    return;
                }
            }

            const cartItemElement = this.createCartItemElement(product, variant, cartItem);
            this.cartItems.appendChild(cartItemElement);
        });

        // Update total
        this.updateCartTotal();
    }

    // Get product by ID (requires products to be loaded)
    getProductById(productId) {
        if (window.productsManager && window.productsManager.products) {
            return window.productsManager.products.find(p => p.id === productId);
        }
        return null;
    }

    // Create cart item element
    createCartItemElement(product, variant, cartItem) {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.dataset.productId = cartItem.productId;
        div.dataset.variantId = cartItem.variantId;

        const productImageUrl = this.buildImageUrl(product.images?.[0] || 'default.jpg');
        const formattedPrice = this.formatPrice(variant.price, variant.currency);

        // Create color circle HTML if color exists
        const colorCircleHtml = variant.color ? `<div class="color-circle" data-color="${variant.color.toLowerCase()}"></div>` : '';
        
        div.innerHTML = `
            <img src="${productImageUrl}" alt="${product.name}" class="cart-item-image" loading="lazy">
            <div class="cart-item-details">
                <div class="cart-item-header">
                    <h4 class="cart-item-name">${product.name}</h4>
                    <button class="remove-item" title="Remove item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19ZM10 11V17M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="cart-item-variant">
                    <span>Size: ${variant.size}</span>
                    ${variant.color ? `<div class="color-info"><span>Color: ${variant.color}</span>${colorCircleHtml}</div>` : ''}
                </div>
                <div class="cart-item-bottom">
                    <div class="quantity-controls">
                        <button class="quantity-btn decrease">−</button>
                        <input type="number" class="quantity-input" value="${cartItem.quantity}" min="1" max="${variant.quantity}" readonly>
                        <button class="quantity-btn increase" ${cartItem.quantity >= variant.quantity ? 'disabled' : ''}>+</button>
                    </div>
                    <div class="cart-item-price">${formattedPrice}</div>
                </div>
            </div>
        `;

        // Bind events
        const decreaseBtn = div.querySelector('.decrease');
        const increaseBtn = div.querySelector('.increase');
        const removeBtn = div.querySelector('.remove-item');

        decreaseBtn.addEventListener('click', () => {
            if (cartItem.quantity > 1) {
                this.updateQuantity(cartItem.productId, cartItem.variantId, cartItem.quantity - 1);
            } else {
                // Remove item when quantity would go below 1
                this.removeFromCart(cartItem.productId, cartItem.variantId);
            }
        });

        increaseBtn.addEventListener('click', () => {
            if (cartItem.quantity < variant.quantity) {
                this.updateQuantity(cartItem.productId, cartItem.variantId, cartItem.quantity + 1);
            }
        });

        removeBtn.addEventListener('click', () => {
            this.removeFromCart(cartItem.productId, cartItem.variantId);
        });

        return div;
    }

    // Update cart total
    async updateCartTotal() {
        if (!this.cartTotalPrice) return;

        let total = 0;
        
        for (const cartItem of this.cart) {
            // Use stored variant data if available, otherwise fetch
            let variant;
            
            if (cartItem.variant) {
                variant = cartItem.variant;
            } else {
                const product = this.getProductById(cartItem.productId);
                if (product) {
                    variant = product.variants?.find(v => v.id === cartItem.variantId);
                }
            }
            
            if (variant) {
                total += variant.price * cartItem.quantity;
            }
        }

        this.cartTotalPrice.textContent = this.formatPrice(total, 'EUR');
    }

    // Build image URL (similar to products.js)
    buildImageUrl(imageName) {
        if (!imageName) return '/assets/images/default.jpg';
        const baseUrl = 'https://raw.githubusercontent.com/ateliervelee/storefront/refs/heads/main/assets/images/';
        return baseUrl + imageName;
    }

    // Format price (similar to products.js)
    formatPrice(price, currency) {
        const euros = price / 100;
        return `€${euros.toFixed(2)}`;
    }

    // Clear entire cart with confirmation
    confirmAndClearCart() {
        if (this.cart.length === 0) {
            return;
        }

        const itemCount = this.getTotalCount();
        const confirmMessage = `Are you sure you want to remove all ${itemCount} item${itemCount > 1 ? 's' : ''} from your cart?`;
        
        if (confirm(confirmMessage)) {
            this.clearCart();
            console.log('🧹 Cart cleared by user');
        }
    }

    // Clear entire cart
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.updateCartDisplay();
        
        window.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: { action: 'clear' }
        }));
    }

    // Get cart items for external access
    getCartItems() {
        return [...this.cart];
    }

    // Check if specific item is in cart
    isInCart(productId, variantId) {
        return this.cart.some(
            item => item.productId === productId && item.variantId === variantId
        );
    }

    // Get quantity of specific item in cart
    getItemQuantity(productId, variantId) {
        const item = this.cart.find(
            item => item.productId === productId && item.variantId === variantId
        );
        return item ? item.quantity : 0;
    }
}

// Initialize cart when DOM is ready AND when scripts are loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCart);
    } else {
        initCart();
    }
});

// Also initialize when all scripts are loaded (fallback)
document.addEventListener('allScriptsLoaded', () => {
    if (!window.shoppingCart) {
        initCart();
    }
});

function initCart() {
    if (!window.shoppingCart) {
        window.shoppingCart = new ShoppingCart();
        console.log('🛒 Shopping cart initialized');
    }
} 