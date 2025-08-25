class CheckoutManager {
    constructor() {
        this.auth = null;
        this.db = null;
        this.currentUser = null;
        this.cartManager = null;
        this.countries = [];
        this.isOrderSummaryExpanded = false;
        
        // Initialize Stripe
        this.stripe = Stripe('pk_test_51RzZOKLtKPQT2y5pQzio38nyUMmM6dSjMtWyuXG77HYAsp7agvkzt8YOnh258iQ0wkwhdXcsa5pzKQqxpziWtkf600FCPW1Fev');
        
        this.init();
    }

    async init() {
        try {
            // Wait for Firebase services to be available
            await this.waitForFirebase();
            
            // Initialize cart manager
            this.cartManager = new ShoppingCart();
            
            // Load countries from constants (with retry for timing issues)
            this.loadCountriesWithRetry();
            
            // Also try after a delay as backup
            setTimeout(() => {
                this.loadCountries();
            }, 500);
            
            // Setup authentication listeners
            this.setupAuth();
            console.log('🔐 CheckoutManager: Auth listeners setup complete');
            
            // Load cart items
            this.loadCartItems();
            
            // Setup form handlers
            this.setupFormHandlers();
            
            // Setup order summary toggle
            this.setupOrderSummaryToggle();

            // Setup checkout options
            this.setupCheckoutOptions();
            
        } catch (error) {
            console.error('CheckoutManager initialization failed:', error);
        }
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkFirebase = () => {
                attempts++;
                
                if (window.firebaseServices && window.firebaseServices.auth && window.firebaseServices.db) {
                    this.auth = window.firebaseServices.auth;
                    this.db = window.firebaseServices.db;
                    resolve();
                } else if (attempts >= maxAttempts) {
                    // Proceed without Firebase - checkout can work without it
                    this.auth = null;
                    this.db = null;
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    loadCountriesWithRetry(attempts = 0) {
        const maxAttempts = 10;
        
        if (window.PRODUCT_CONSTANTS && window.PRODUCT_CONSTANTS.countries) {
            this.loadCountries();
        } else if (attempts < maxAttempts) {
            setTimeout(() => {
                this.loadCountriesWithRetry(attempts + 1);
            }, 100);
        } else {
            this.loadCountries();
        }
    }

    loadCountries() {
        const countrySelect = document.getElementById('country');
        
        // Check if countries are already loaded (avoid duplicate loading)
        if (countrySelect.querySelector('option[value="HR"]')) {
            return; // Croatia already exists, don't reload
        }
        
        // Create a copy of the countries array to avoid modifying the original
        let countries = [...(window.PRODUCT_CONSTANTS?.countries || [])];
        
        // If no countries available, add Croatia manually as fallback
        if (countries.length === 0) {
            countries = [{
                code: 'HR',
                name: 'Croatia',
                deliveryFee: 0.00,
                currency: 'EUR'
            }];
        }
        
        // Clear all existing options except placeholder
        const placeholder = countrySelect.querySelector('option[value=""]');
        countrySelect.innerHTML = '';
        if (placeholder) {
            countrySelect.appendChild(placeholder);
        }
        
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            countrySelect.appendChild(option);
        });

        // Set Croatia as default and remove the "Select country" option
        if (countries.length > 0) {
            countrySelect.value = countries[0].code;
            
            // Remove the placeholder option
            const placeholderOption = countrySelect.querySelector('option[value=""]');
            if (placeholderOption) {
                placeholderOption.remove();
            }
        }
    }

    setupAuth() {
        const signInBtn = document.getElementById('signInBtn');
        const signOutBtn = document.getElementById('signOutBtn');

        if (!this.auth) {
            // Hide auth section if Firebase is not available
            const authSection = document.getElementById('authSection');
            if (authSection) {
                authSection.style.display = 'none';
            }
            return;
        }

        // Sign in button
        signInBtn.addEventListener('click', async () => {
            try {
                console.log('🔐 Sign in button clicked - starting Google auth...');
                
                // Show loading state
                const originalText = signInBtn.textContent;
                signInBtn.textContent = 'Opening Google Sign-in...';
                signInBtn.disabled = true;
                
                const provider = new firebase.auth.GoogleAuthProvider();
                console.log('🔐 Starting signInWithPopup...');
                const result = await this.auth.signInWithPopup(provider);
                console.log('✅ Sign in successful:', result.user.email);
                
                // Success - button will be hidden by updateAuthUI
            } catch (error) {
                console.error('❌ Sign in error:', error);
                
                // Handle specific error cases
                if (error.code === 'auth/popup-closed-by-user') {
                    console.log('ℹ️ User closed the popup');
                } else if (error.code === 'auth/popup-blocked') {
                    alert('Popup was blocked. Please allow popups for this site and try again.');
                } else {
                    alert('Failed to sign in. Please try again.');
                }
                
                // Restore button state on error
                signInBtn.textContent = originalText;
                signInBtn.disabled = false;
            }
        });

        // Sign out button
        signOutBtn.addEventListener('click', async () => {
            try {
                await this.auth.signOut();
            } catch (error) {
                console.error('Sign out error:', error);
            }
        });

        // Auth state listener
        this.auth.onAuthStateChanged((user) => {
            console.log('🔐 Auth state changed:', user ? 'User signed in' : 'User signed out');
            if (user) {
                console.log('👤 User details:', {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                });
            }
            
            this.currentUser = user;
            this.updateAuthUI(user);
            this.prefillUserData(user);
        });

        // No need for redirect result handling since we're using popup

        // Check current auth state immediately
        const currentUser = this.auth.currentUser;
        console.log('🔍 Current auth state on setup:', currentUser ? `Signed in as ${currentUser.email}` : 'Not signed in');
        
        // Also check after a short delay to see if state changes
        setTimeout(() => {
            const delayedUser = this.auth.currentUser;
            console.log('🔍 Auth state after 1 second:', delayedUser ? `Signed in as ${delayedUser.email}` : 'Still not signed in');
        }, 1000);
    }

    updateAuthUI(user) {
        console.log('🎨 Updating auth UI for user:', user ? user.email : 'null');
        
        const authSection = document.querySelector('.auth-section');
        const signedOut = document.getElementById('signedOut');
        const signedIn = document.getElementById('signedIn');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');

        console.log('🔍 DOM elements found:', {
            authSection: !!authSection,
            signedOut: !!signedOut,
            signedIn: !!signedIn,
            userAvatar: !!userAvatar,
            userName: !!userName,
            userEmail: !!userEmail
        });

        if (user) {
            console.log('👤 User is signed in - hiding auth section');
            // Hide the entire auth section when user is signed in
            if (authSection) {
                authSection.style.display = 'none';
                console.log('✅ Auth section hidden');
            }
            
            // Still update the signed-in UI elements in case they're used elsewhere
            if (signedOut) signedOut.style.display = 'none';
            if (signedIn) signedIn.style.display = 'block';
            
            if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/40';
            if (userName) userName.textContent = user.displayName || 'User';
            if (userEmail) userEmail.textContent = user.email;
        } else {
            console.log('🚫 User is not signed in - showing auth section');
            // Show the auth section when user is not signed in
            if (authSection) {
                authSection.style.display = 'block';
                console.log('✅ Auth section shown');
            }
            
            if (signedOut) signedOut.style.display = 'block';
            if (signedIn) signedIn.style.display = 'none';
        }
    }

    prefillUserData(user) {
        const emailField = document.getElementById('email');
        const firstNameField = document.getElementById('firstName');
        const lastNameField = document.getElementById('lastName');

        if (user) {
            // Prefill email
            emailField.value = user.email || '';
            
            // Prefill name - split displayName into first and last name
            if (user.displayName) {
                const nameParts = user.displayName.trim().split(' ');
                if (nameParts.length >= 1) {
                    firstNameField.value = nameParts[0];
                }
                if (nameParts.length >= 2) {
                    lastNameField.value = nameParts.slice(1).join(' ');
                }
            }
        } else {
            // Clear fields when signed out
            emailField.value = '';
            firstNameField.value = '';
            lastNameField.value = '';
        }
    }

    loadCartItems() {
        const cartItemsContainer = document.getElementById('checkoutCartItems');
        const cartItems = this.cartManager.getCartItems();

        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <p>Your cart is empty</p>
                    <a href="/" class="continue-shopping">Continue Shopping</a>
                </div>
            `;
            this.updateTotals(0, 0);
            return;
        }

        let subtotal = 0;
        cartItemsContainer.innerHTML = '';

        cartItems.forEach(cartItem => {
            const { product, variant } = cartItem;
            const itemTotal = variant.price * cartItem.quantity;
            subtotal += itemTotal;

            const cartItemElement = this.createCheckoutCartItem(cartItem);
            cartItemsContainer.appendChild(cartItemElement);
        });

        this.updateTotals(subtotal, 0); // 0 delivery fee for Croatia
        
        // Update submit button state when cart changes
        this.updateSubmitButton();
    }

    createCheckoutCartItem(cartItem) {
        const { product, variant } = cartItem;
        const itemTotal = variant.price * cartItem.quantity;
        
        // Use first image if available
        const imageUrl = product.images && product.images.length > 0 
            ? this.buildImageUrl(product.images[0]) 
            : 'https://via.placeholder.com/80';

        const div = document.createElement('div');
        div.className = 'checkout-cart-item';
        
        div.innerHTML = `
            <img src="${imageUrl}" alt="${product.name}" class="checkout-item-image" loading="lazy">
            <div class="checkout-item-details">
                <h4 class="checkout-item-name">${product.name}</h4>
                <div class="checkout-item-variant">
                    <span>Size: ${variant.size}</span>
                    ${variant.color ? `<span>Color: ${variant.color}</span>` : ''}
                    <span>Qty: ${cartItem.quantity}</span>
                </div>
            </div>
            <div class="checkout-item-price">${this.formatPrice(itemTotal, variant.currency)}</div>
        `;

        return div;
    }

    buildImageUrl(imageName) {
        const baseUrl = window.PRODUCT_CONSTANTS?.imageBaseUrl || 'assets/images/';
        return `${baseUrl}${imageName}`;
    }

    formatPrice(amount, currency = 'EUR') {
        const euros = amount / 100;
        return `€${euros.toFixed(2)}`;
    }

    updateTotals(subtotal, deliveryFee) {
        const subtotalElement = document.getElementById('subtotalAmount');
        const deliveryElement = document.getElementById('deliveryAmount');
        const totalElement = document.getElementById('totalAmount');
        const summaryHeaderTotal = document.getElementById('summaryHeaderTotal');

        const total = subtotal + deliveryFee;

        subtotalElement.textContent = this.formatPrice(subtotal);
        deliveryElement.textContent = deliveryFee === 0 ? 'Free' : this.formatPrice(deliveryFee);
        totalElement.textContent = this.formatPrice(total);
        if (summaryHeaderTotal) summaryHeaderTotal.textContent = this.formatPrice(total);

        // Enable/disable place order button
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        placeOrderBtn.disabled = subtotal === 0;
    }

    setupFormHandlers() {
        const billingForm = document.getElementById('billingForm');
        const shippingForm = document.getElementById('shippingForm');
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        const mobilePayBtn = document.getElementById('mobilePayBtn');

        // Handle both desktop and mobile buttons
        [placeOrderBtn, mobilePayBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await this.handlePlaceOrder();
                });
            }
        });

        // Setup validation for all forms
        [billingForm, shippingForm].forEach(form => {
            if (form) {
                const allFields = form.querySelectorAll('input, select');
                allFields.forEach(field => {
                    // Remove any validation classes initially
                    field.classList.remove('valid', 'invalid');
                    
                    // Add input listeners for real-time validation after first submit attempt
                    field.addEventListener('input', () => {
                        if (this.hasAttemptedSubmit) {
                            this.validateField(field);
                            this.updateSubmitButton();
                        }
                    });
                });
            }
        });

        // Setup validation for company fields
        const companyFields = document.querySelectorAll('#companyName, #vatId');
        companyFields.forEach(field => {
            field.classList.remove('valid', 'invalid');
            
            field.addEventListener('input', () => {
                if (this.hasAttemptedSubmit) {
                    this.validateField(field);
                    this.updateSubmitButton();
                }
            });
        });

        // Initialize submit button state
        this.hasAttemptedSubmit = false;
        this.updateSubmitButton();
    }

    validateField(field) {
        const isValid = field.checkValidity() && field.value.trim() !== '';
        
        field.classList.remove('valid', 'invalid');
        if (this.hasAttemptedSubmit) {
            if (isValid) {
                field.classList.add('valid');
            } else {
                field.classList.add('invalid');
            }
        }
        
        return isValid;
    }

    validateAllFields() {
        let allValid = true;

        // Validate billing form
        const billingForm = document.getElementById('billingForm');
        if (billingForm) {
            const billingFields = billingForm.querySelectorAll('[required]');
            billingFields.forEach(field => {
                const isValid = this.validateField(field);
                if (!isValid) {
                    allValid = false;
                }
            });
        }

        // Validate shipping form if visible
        const sameAsBilling = document.getElementById('sameAsBilling').checked;
        if (!sameAsBilling) {
            const shippingForm = document.getElementById('shippingForm');
            if (shippingForm) {
                const shippingFields = shippingForm.querySelectorAll('[required]');
                shippingFields.forEach(field => {
                    const isValid = this.validateField(field);
                    if (!isValid) {
                        allValid = false;
                    }
                });
            }
        }

        // Validate company fields if visible
        const needInvoice = document.getElementById('needInvoice').checked;
        if (needInvoice) {
            const companyFields = document.querySelectorAll('#companyName[required], #vatId[required]');
            companyFields.forEach(field => {
                const isValid = this.validateField(field);
                if (!isValid) {
                    allValid = false;
                }
            });
        }

        return allValid;
    }

    updateSubmitButton() {
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        const cartItems = this.cartManager.getCartItems();
        
        // Only disable if cart is empty, don't check form validity until submit
        placeOrderBtn.disabled = cartItems.length === 0;
    }

    async handlePlaceOrder() {
        // Mark that submit has been attempted
        this.hasAttemptedSubmit = true;
        
        // Validate all fields and show visual feedback
        const isFormValid = this.validateAllFields();
        
        if (!isFormValid) {
            alert('Please fill in all required fields.');
            return;
        }

        const placeOrderBtn = document.getElementById('placeOrderBtn');
        const mobilePayBtn = document.getElementById('mobilePayBtn');
        
        // Get elements for both buttons
        const buttons = [placeOrderBtn, mobilePayBtn].filter(btn => btn);
        const loadingElements = buttons.map(btn => ({
            button: btn,
            loading: btn.querySelector('.order-loading'),
            text: btn.querySelector('span')
        }));

        try {
            // Show loading state on all buttons
            loadingElements.forEach(({ button, loading, text }) => {
                text.style.visibility = 'hidden';
                loading.style.display = 'flex';
                button.disabled = true;
            });

            // Collect form data
            const formData = this.collectFormData();
            
            // Collect cart data
            const cartItems = this.cartManager.getCartItems();
            
            if (cartItems.length === 0) {
                alert('Your cart is empty.');
                return;
            }

            // Create line items for Stripe
            const lineItems = cartItems.map(item => ({
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: item.product.name,
                        description: `Size: ${item.variant.size}, Color: ${item.variant.color}`,
                        images: item.product.images ? [item.product.images[0]] : []
                    },
                    unit_amount: item.variant.price // Price in cents
                },
                quantity: item.quantity
            }));

            // Create checkout session via Cloudflare Worker
            const workerUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? '/create-checkout-session' // Local development uses Node.js server
                : 'https://atelier-velee-payments.ateliervelee.workers.dev'; // Production uses Cloudflare Worker
            
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    line_items: lineItems,
                    customer_email: formData.billing.email,
                    metadata: {
                        orderId: Date.now().toString(),
                        userId: this.currentUser?.uid || 'guest',
                        customerData: JSON.stringify(formData)
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const { sessionId } = await response.json();
            
            // Clear cart before redirecting to payment
            this.cartManager.clearCart();
            
            // Redirect to Stripe Checkout
            const { error } = await this.stripe.redirectToCheckout({
                sessionId: sessionId
            });

            if (error) {
                throw new Error(error.message);
            }

        } catch (error) {
            alert('Failed to process payment. Please try again.');
        } finally {
            // Hide loading state on all buttons
            loadingElements.forEach(({ button, loading, text }) => {
                text.style.visibility = 'visible';
                loading.style.display = 'none';
                button.disabled = false;
            });
        }
    }

    collectFormData() {
        const billingForm = document.getElementById('billingForm');
        const shippingForm = document.getElementById('shippingForm');
        const sameAsBilling = document.getElementById('sameAsBilling').checked;
        const needInvoice = document.getElementById('needInvoice').checked;
        
        const billingData = new FormData(billingForm);
        
        const result = {
            billing: {
                firstName: billingData.get('firstName'),
                lastName: billingData.get('lastName'),
                email: billingData.get('email'),
                phone: billingData.get('phone'),
                country: billingData.get('country'),
                address: billingData.get('address'),
                addressDetails: billingData.get('addressDetails'),
                city: billingData.get('city'),
                postcode: billingData.get('postcode')
            },
            shipping: {},
            company: null,
            options: {
                sameAsBilling: sameAsBilling,
                needInvoice: needInvoice
            }
        };

        // Collect shipping data if different from billing
        if (!sameAsBilling && shippingForm) {
            const shippingData = new FormData(shippingForm);
            result.shipping = {
                firstName: shippingData.get('shippingFirstName'),
                lastName: shippingData.get('shippingLastName'),
                country: shippingData.get('shippingCountry'),
                address: shippingData.get('shippingAddress'),
                addressDetails: shippingData.get('shippingAddressDetails'),
                city: shippingData.get('shippingCity'),
                postcode: shippingData.get('shippingPostcode'),
                phone: shippingData.get('shippingPhone')
            };
        } else {
            // Use billing address for shipping
            result.shipping = { ...result.billing };
        }

        // Collect company data if needed
        if (needInvoice) {
            result.company = {
                companyName: document.getElementById('companyName')?.value || '',
                vatId: document.getElementById('vatId')?.value || ''
            };
        }

        return result;
    }

    async saveOrder(order) {
        // TODO: Implement Firebase order saving
        try {
            const ordersCollection = this.db.collection('orders');
            await ordersCollection.add(order);

        } catch (error) {
            console.error('Error saving order:', error);
            throw error;
        }
    }

        setupOrderSummaryToggle() {
        const header = document.getElementById('orderSummaryHeader');
        const content = document.getElementById('orderSummaryContent');
        const toggle = document.getElementById('summaryToggle');

        if (!header || !content || !toggle) return;

        // Set initial state (collapsed on mobile)
        content.classList.add('collapsed');

        header.addEventListener('click', () => {
            this.isOrderSummaryExpanded = !this.isOrderSummaryExpanded;
            
            if (this.isOrderSummaryExpanded) {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
                header.classList.add('expanded');
                toggle.classList.add('expanded');
            } else {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
                header.classList.remove('expanded');
                toggle.classList.remove('expanded');
            }
        });
    }

    setupCheckoutOptions() {
        const sameAsBillingCheckbox = document.getElementById('sameAsBilling');
        const needInvoiceCheckbox = document.getElementById('needInvoice');
        const shippingSection = document.getElementById('shippingSection');
        const companySection = document.getElementById('companySection');

        if (!sameAsBillingCheckbox || !needInvoiceCheckbox || !shippingSection || !companySection) return;

        // Handle "Shipping is same as billing" checkbox
        sameAsBillingCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                shippingSection.style.display = 'none';
                // Clear shipping form validation
                this.clearShippingValidation();
            } else {
                shippingSection.style.display = 'block';
                // Copy billing data to shipping
                this.copyBillingToShipping();
                // Load countries for shipping dropdown
                this.loadCountriesForShipping();
            }
        });

        // Handle "I need Company invoice" checkbox
        needInvoiceCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                companySection.style.display = 'block';
            } else {
                companySection.style.display = 'none';
                // Clear company form data
                this.clearCompanyData();
            }
        });
    }

    copyBillingToShipping() {
        // Copy billing data to shipping form
        const billingForm = document.getElementById('billingForm');
        const shippingForm = document.getElementById('shippingForm');
        
        if (!billingForm || !shippingForm) return;

        const billingData = new FormData(billingForm);
        
        // Map billing fields to shipping fields
        const fieldMapping = {
            'firstName': 'shippingFirstName',
            'lastName': 'shippingLastName',
            'phone': 'shippingPhone',
            'country': 'shippingCountry',
            'address': 'shippingAddress',
            'addressDetails': 'shippingAddressDetails',
            'city': 'shippingCity',
            'postcode': 'shippingPostcode'
        };

        for (const [billingField, shippingField] of Object.entries(fieldMapping)) {
            const billingValue = billingData.get(billingField);
            const shippingInput = document.getElementById(shippingField);
            if (shippingInput && billingValue) {
                shippingInput.value = billingValue;
            }
        }
    }

    loadCountriesForShipping() {
        const shippingCountrySelect = document.getElementById('shippingCountry');
        if (!shippingCountrySelect) return;

        // Use the same countries as billing
        const countries = [...(window.PRODUCT_CONSTANTS?.countries || [])];
        
        if (countries.length === 0) {
            countries.push({
                code: 'HR',
                name: 'Croatia',
                deliveryFee: 0.00,
                currency: 'EUR'
            });
        }

        // Clear existing options
        shippingCountrySelect.innerHTML = '<option value="">Select country...</option>';
        
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            shippingCountrySelect.appendChild(option);
        });

        // Set Croatia as default
        shippingCountrySelect.value = 'HR';
    }

    clearShippingValidation() {
        const shippingInputs = document.querySelectorAll('#shippingForm input, #shippingForm select');
        shippingInputs.forEach(input => {
            input.classList.remove('valid', 'invalid');
        });
    }

    clearCompanyData() {
        const companyName = document.getElementById('companyName');
        const vatId = document.getElementById('vatId');
        
        if (companyName) companyName.value = '';
        if (vatId) vatId.value = '';
        
        // Clear validation classes
        [companyName, vatId].forEach(input => {
            if (input) input.classList.remove('valid', 'invalid');
        });
    }
}

// Component loader function (same as script.js)
async function loadComponent(componentPath, placeholderSelector) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Failed to load ${componentPath}: ${response.status}`);
        }
        const html = await response.text();
        const placeholder = document.querySelector(placeholderSelector);
        if (placeholder) {
            placeholder.outerHTML = html;
        }
    } catch (error) {
        console.error(`Error loading component: ${error.message}`);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.checkoutManager = new CheckoutManager();
    
    // Load footer component
    await loadComponent('footer.html', 'footer-placeholder');
    
    // Set the current year in the footer
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
    

}); 