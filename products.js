// Products Management

class ProductsManager {
    constructor() {
        this.products = [];
        this.productsGrid = document.getElementById('productsGrid');
        this.loadProducts();
    }

    async loadProducts() {
        try {
            console.log('🔄 Loading products from Firestore...');
            console.log('🔍 Checking Firebase services:', window.firebaseServices);
            console.log('🔍 Firebase db:', window.firebaseServices?.db);
            
            if (!window.firebaseServices?.db) {
                console.log('⚠️ Firebase not available, loading demo products');
                this.loadDemoProducts();
                return;
            }

            const db = window.firebaseServices.db;
            const productsSnapshot = await db.collection('products').where('status', '==', 'active').get();
            const products = [];

            // Fetch each product with its variants
            for (const productDoc of productsSnapshot.docs) {
                const productData = {
                    id: productDoc.id,
                    ...productDoc.data()
                };

                // Fetch variants for this product
                const variantsSnapshot = await db.collection('products')
                    .doc(productDoc.id)
                    .collection('variants')
                    .get();

                productData.variants = variantsSnapshot.docs.map(variantDoc => ({
                    id: variantDoc.id,
                    ...variantDoc.data()
                }));

                // Only include products that have variants
                if (productData.variants.length > 0) {
                    products.push(productData);
                }
            }

            this.products = products;
            console.log(`✅ Loaded ${products.length} products`);
            this.renderProducts();
            
            // Dispatch event for cart validation
            window.dispatchEvent(new CustomEvent('productsLoaded'));
            
        } catch (error) {
            console.error('❌ Error loading products:', error);
            this.loadDemoProducts();
        }
    }

    loadDemoProducts() {
        // Demo products for when Firebase is not available
        // Prices are in eurocents (same as admin panel)
        this.products = [
            {
                id: 'demo1',
                name: 'Elegant Evening Dress',
                images: ['https://images.unsplash.com/photo-1566479179817-c0e72b5cef77?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
                variants: [
                    { id: 'v1', size: 'S', color: 'black', price: 29900, currency: 'EUR', quantity: 5 },
                    { id: 'v2', size: 'M', color: 'black', price: 29900, currency: 'EUR', quantity: 3 },
                    { id: 'v3', size: 'L', color: 'black', price: 29900, currency: 'EUR', quantity: 2 }
                ]
            },
            {
                id: 'demo2',
                name: 'Luxury Silk Blouse',
                images: ['https://images.unsplash.com/photo-1581803118522-7b72a50f7e9f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
                variants: [
                    { id: 'v4', size: 'XS', color: 'white', price: 18900, currency: 'EUR', quantity: 4 },
                    { id: 'v5', size: 'S', color: 'white', price: 18900, currency: 'EUR', quantity: 6 },
                    { id: 'v6', size: 'M', color: 'beige', price: 18900, currency: 'EUR', quantity: 2 }
                ]
            }
        ];
        console.log('📦 Loaded demo products');
        this.renderProducts();
        
        // Dispatch event for cart validation
        window.dispatchEvent(new CustomEvent('productsLoaded'));
    }

    renderProducts() {
        // Clear skeleton loading
        this.productsGrid.innerHTML = '';

        if (this.products.length === 0) {
            this.productsGrid.innerHTML = '<div class="no-products">No products available</div>';
            return;
        }

        this.products.forEach(product => {
            const productCard = this.createProductCard(product);
            this.productsGrid.appendChild(productCard);
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        try {
            const minPrice = Math.min(...(product.variants || []).map(v => v.price || 0));
            const createdMs = (typeof product.createdAt === 'number')
                ? product.createdAt
                : (product.createdAt && typeof product.createdAt.toMillis === 'function')
                    ? product.createdAt.toMillis()
                    : (product.createdAt && typeof product.createdAt.seconds === 'number')
                        ? product.createdAt.seconds * 1000
                        : (product.createdAt && typeof product.createdAt._seconds === 'number')
                            ? product.createdAt._seconds * 1000
                            : (product.createdAtMs || (product.createdAtDate ? new Date(product.createdAtDate).getTime() : Date.now()));
            card.dataset.price = String(isFinite(minPrice) ? minPrice : 0);
            card.dataset.date = String(createdMs);
            const cat = (product.category || product.type || product.collection || '').toString().toLowerCase();
            if (cat) card.dataset.category = cat;
        } catch (e) {}
        
        // Get the smallest size variant for default selection
        const sortedVariants = this.sortVariantsBySize(product.variants);
        const defaultVariant = sortedVariants[0];
        
        // Get available sizes and colors
        const availableSizes = [...new Set(product.variants.map(v => v.size))].sort((a, b) => {
            const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
            return sizeOrder.indexOf(a) - sizeOrder.indexOf(b);
        });
        
        const firstAvailableSize = availableSizes.find(s => product.variants.some(v => v.size === s && (v.quantity || 0) > 0)) || null;
        const currentVariant = firstAvailableSize
            ? (product.variants.find(v => v.size === firstAvailableSize && (v.quantity || 0) > 0) || product.variants.find(v => v.size === firstAvailableSize))
            : product.variants[0];
        const imageUrl = this.buildImageUrl(product.images?.[0]);

        card.innerHTML = `
            <div class="product-image-container">
                <img src="${imageUrl}" alt="${product.name}" class="product-image">
            </div>
            <div class="product-info">
                                   <div class="product-header">
                       <h3 class="product-name">${product.name}</h3>
                       <div class="product-price">${this.formatPrice(currentVariant.price, currentVariant.currency)}</div>
                   </div>
                <div class="product-options">
                    <div class="product-variants">
                        <div class="size-selector">
                            ${availableSizes.map(size => {
                                const hasStock = product.variants.some(v => v.size === size && (v.quantity || 0) > 0);
                                const isSelected = firstAvailableSize ? (size === firstAvailableSize) : false;
                                return `
                                    <button class="size-option ${isSelected ? 'selected' : ''}" 
                                            data-size="${size}" data-product-id="${product.id}" ${hasStock ? '' : 'disabled'}>
                                        ${size}
                                    </button>
                                `;
                            }).join('')}
                        </div>
                        <div class="color-info">
                            <div class="color-circle" data-color="${currentVariant.color}"></div>
                            <span class="color-label">${currentVariant.color}</span>
                        </div>
                    </div>
                </div>
                <button class="add-to-cart" data-product-id="${product.id}" data-variant-id="${currentVariant.id}">
                    Add to Cart
                </button>
            </div>
        `;

        // Add event listeners for size selection
        const sizeOptions = card.querySelectorAll('.size-option');
        sizeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                this.handleSizeChange(e, product, card);
            });
        });

        // Initialize add-to-cart state
        const addToCartBtn = card.querySelector('.add-to-cart');
        const anyInStock = product.variants.some(v => (v.quantity || 0) > 0);
        addToCartBtn.disabled = !anyInStock;
        addToCartBtn.textContent = addToCartBtn.disabled ? 'Sold out' : 'Add to Cart';

        // Add event listener for add to cart
        addToCartBtn.addEventListener('click', () => {
            this.handleAddToCart(product, card);
        });

        // Navigate to product detail using product slug (fallback to id)
        const imageContainer = card.querySelector('.product-image-container');
        if (imageContainer) {
            imageContainer.style.cursor = 'pointer';
            imageContainer.addEventListener('click', () => {
                const selectedSizeEl = card.querySelector('.size-option.selected');
                const selectedSize = selectedSizeEl ? selectedSizeEl.dataset.size : (availableSizes[0] || null);
                const selectedVariant = selectedSize ? (product.variants.find(v => v.size === selectedSize) || product.variants[0]) : product.variants[0];
                const sku = (selectedVariant && (selectedVariant.sku || selectedVariant.variantSku || selectedVariant.id)) || '';
                const slug = product.slug || product.handle || null;

                // Store full product snapshot in session for instant hydration
                try {
                    const snapshot = {
                        product,
                        selectedVariantId: selectedVariant ? selectedVariant.id : null,
                        selectedSize,
                        selectedSku: sku || null,
                        savedAt: Date.now()
                    };
                    sessionStorage.setItem('pd:last', JSON.stringify(snapshot));
                    if (product && product.id) {
                        sessionStorage.setItem(`pd:id:${product.id}`, JSON.stringify(snapshot));
                    }
                    if (slug) {
                        sessionStorage.setItem(`pd:slug:${slug}`, JSON.stringify(snapshot));
                    }
                    if (sku) {
                        sessionStorage.setItem(`pd:sku:${sku}`, JSON.stringify(snapshot));
                    }
                } catch (e) {
                    // ignore storage errors
                }

                const url = slug ? `product.html?slug=${encodeURIComponent(slug)}` : (product.id ? `product.html?id=${encodeURIComponent(product.id)}` : `product.html`);
                window.location.href = url;
            });
        }

        return card;
    }

    handleSizeChange(event, product, card) {
        const selectedSize = event.target.dataset.size;
        const sizeOptions = card.querySelectorAll('.size-option');
        
        // Update selected size visual
        sizeOptions.forEach(option => {
            option.classList.toggle('selected', option.dataset.size === selectedSize);
        });

        // Find the variant for the selected size
        const selectedVariant = product.variants.find(v => v.size === selectedSize);
        if (selectedVariant) {
            // Update price
            const priceElement = card.querySelector('.product-price');
            priceElement.textContent = this.formatPrice(selectedVariant.price, selectedVariant.currency);

            // Update color
            const colorCircle = card.querySelector('.color-circle');
            const colorLabel = card.querySelector('.color-label');
            colorCircle.dataset.color = selectedVariant.color;
            colorLabel.textContent = selectedVariant.color;

            // Update add to cart button
            const addToCartBtn = card.querySelector('.add-to-cart');
            addToCartBtn.dataset.variantId = selectedVariant.id;

            // Toggle add-to-cart based on selected variant stock
            addToCartBtn.disabled = !((selectedVariant.quantity || 0) > 0);
            addToCartBtn.textContent = addToCartBtn.disabled ? 'Sold out' : 'Add to Cart';
        }

        // Also reflect disabled state for size buttons after selection
        const disabledByStock = (size) => !product.variants.some(v => v.size === size && (v.quantity || 0) > 0);
        sizeOptions.forEach(option => {
            const size = option.dataset.size;
            option.disabled = disabledByStock(size);
        });
    }

    sortVariantsBySize(variants) {
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        return variants.sort((a, b) => {
            return sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size);
        });
    }

    buildImageUrl(imageName) {
        if (!imageName) {
            return 'https://images.unsplash.com/photo-1566479179817-c0e72b5cef77?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        }
        
        // If it's already a full URL, return as is
        if (imageName.startsWith('http')) {
            return imageName;
        }
        
        // Build URL from base path
        const baseUrl = 'https://raw.githubusercontent.com/ateliervelee/storefront/refs/heads/main/assets/images/';
        return baseUrl + imageName;
    }

    formatPrice(price, currency = 'EUR') {
        // Convert from eurocents to euros (same logic as admin panel)
        const euros = Math.floor(price / 100);
        const cents = price % 100;
        
        // Format based on currency
        if (currency === 'EUR') {
            return `€${euros}.${cents.toString().padStart(2, '0')}`;
        } else if (currency === 'USD') {
            return `$${euros}.${cents.toString().padStart(2, '0')}`;
        } else if (currency === 'GBP') {
            return `£${euros}.${cents.toString().padStart(2, '0')}`;
        } else {
            return `${currency} ${euros}.${cents.toString().padStart(2, '0')}`;
        }
    }

    handleAddToCart(product, card) {
        // Get the currently selected variant
        const selectedSizeElement = card.querySelector('.size-option.selected');
        if (!selectedSizeElement) {
            console.error('No size selected');
            return;
        }

        const selectedSize = selectedSizeElement.dataset.size;
        const selectedVariant = product.variants.find(v => v.size === selectedSize);
        
        if (!selectedVariant) {
            console.error('Selected variant not found');
            return;
        }

        // Check if variant has stock
        if (selectedVariant.quantity <= 0) {
            alert('Sorry, this item is out of stock.');
            return;
        }

        // Check if cart system is available
        if (!window.shoppingCart) {
            console.error('Shopping cart not initialized');
            return;
        }

        // Add to cart with complete product and variant data
        window.shoppingCart.addToCart(product.id, selectedVariant.id, 1, product, selectedVariant);
        
        // Optional: Show success feedback
        const addToCartBtn = card.querySelector('.add-to-cart');
        const originalText = addToCartBtn.textContent;
        
        addToCartBtn.textContent = 'Added!';
        addToCartBtn.style.background = '#4ade80'; // Green
        
        setTimeout(() => {
            addToCartBtn.textContent = originalText;
            addToCartBtn.style.background = '';
        }, 1500);
    }
}

// Scroll to products section
function scrollToProducts() {
    const productsSection = document.getElementById('products');
    if (productsSection) {
        productsSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Initialize products when all scripts are loaded
document.addEventListener('allScriptsLoaded', () => {
    console.log('🎯 All scripts loaded, initializing products...');
    
    const initProducts = () => {
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            new ProductsManager();
        } else {
            console.error('❌ productsGrid element not found!');
        }
    };

    // Small delay to ensure everything is ready
    setTimeout(initProducts, 100);
}); 