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
            
            // Check if user returned from Stripe and reset loading state
            this.checkPendingCheckout();
            
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
        this.auth.onAuthStateChanged(async (user) => {
            console.log('🔐 Auth state changed:', user ? `User signed in (${user.isAnonymous ? 'anonymous' : 'authenticated'})` : 'User signed out');
            
            // If no user, sign in anonymously
            if (!user) {
                try {
                    console.log('👤 No user found, signing in anonymously...');
                    await this.auth.signInAnonymously();
                    console.log('✅ Anonymous sign-in successful');
                    return; // onAuthStateChanged will be called again with the new user
                } catch (error) {
                    console.error('❌ Anonymous sign-in failed:', error);
                    return;
                }
            }
            
            if (user) {
                console.log('👤 User details:', {
                    uid: user.uid,
                    email: user.email || 'N/A (anonymous)',
                    displayName: user.displayName || 'N/A (anonymous)',
                    isAnonymous: user.isAnonymous
                });
            }
            
            this.currentUser = user;
            this.updateAuthUI(user);
            
            // Only prefill form data for authenticated (non-anonymous) users
            if (user && !user.isAnonymous) {
                this.prefillUserData(user);
            }
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

        if (user && !user.isAnonymous) {
            console.log('👤 User is authenticated - hiding auth section');
            // Hide the entire auth section when user is authenticated (not anonymous)
            if (authSection) {
                authSection.style.display = 'none';
                console.log('✅ Auth section hidden');
            }
            
            // Update the signed-in UI elements
            if (signedOut) signedOut.style.display = 'none';
            if (signedIn) signedIn.style.display = 'block';
            
            if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/40';
            if (userName) userName.textContent = user.displayName || 'User';
            if (userEmail) userEmail.textContent = user.email;
        } else {
            console.log(user && user.isAnonymous ? '👤 User is anonymous - showing auth section' : '🚫 User is not signed in - showing auth section');
            // Show the auth section for anonymous users or when no user is signed in
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
            console.log('👤 Prefilling user data for:', user.email);
            
            // Only prefill email if field is empty
            if (emailField && (!emailField.value || emailField.value.trim() === '')) {
                emailField.value = user.email || '';
                console.log('📧 Prefilled email:', user.email);
            } else {
                console.log('📧 Email field already has value, keeping:', emailField?.value);
            }
            
            // Only prefill name if fields are empty and displayName exists
            if (user.displayName) {
                const nameParts = user.displayName.trim().split(' ');
                
                if (firstNameField && (!firstNameField.value || firstNameField.value.trim() === '') && nameParts.length >= 1) {
                    firstNameField.value = nameParts[0];
                    console.log('👤 Prefilled first name:', nameParts[0]);
                } else {
                    console.log('👤 First name field already has value, keeping:', firstNameField?.value);
                }
                
                if (lastNameField && (!lastNameField.value || lastNameField.value.trim() === '') && nameParts.length >= 2) {
                    lastNameField.value = nameParts.slice(1).join(' ');
                    console.log('👤 Prefilled last name:', nameParts.slice(1).join(' '));
                } else {
                    console.log('👤 Last name field already has value, keeping:', lastNameField?.value);
                }
            }
        } else {
            // Only clear fields if they're empty (don't clear user-entered data when signing out)
            console.log('🚫 User signed out - NOT clearing fields to preserve user data');
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
        console.log('🛒 Place Order clicked!');
        
        // Mark that submit has been attempted
        this.hasAttemptedSubmit = true;
        
        // Validate all fields and show visual feedback
        const isFormValid = this.validateAllFields();
        
        if (!isFormValid) {
            console.log('❌ Form validation failed');
            alert('Please fill in all required fields.');
            return;
        }
        
        console.log('✅ Form validation passed');

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
            // Immediately disable buttons to prevent double-clicks
            loadingElements.forEach(({ button }) => {
                button.disabled = true;
            });
            
            // Show loading state on all buttons
            loadingElements.forEach(({ button, loading, text }) => {
                text.style.visibility = 'hidden';
                loading.style.display = 'flex';
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
            const workerUrl = 'https://atelier-velee-payments.ateliervelee.workers.dev'; // Always use Cloudflare Worker
            
            console.log('🔍 Checkout Debug:');
            console.log('- Current hostname:', window.location.hostname);
            console.log('- Is localhost?', window.location.hostname === 'localhost');
            console.log('- Worker URL:', workerUrl);
            console.log('- Cart items:', cartItems.length);
            console.log('- Line items:', lineItems);
            
            // Prepare customer data for Stripe prefill
            const customerInfo = {
                email: formData.billing.email,
                name: `${formData.billing.firstName} ${formData.billing.lastName}`,
                address: {
                    line1: formData.billing.address,
                    line2: formData.billing.addressDetails || undefined,
                    city: formData.billing.city,
                    postal_code: formData.billing.postcode,
                    country: 'HR' // Croatia
                },
                phone: formData.billing.phone || undefined
            };

            // Use shipping address if different from billing
            const shippingInfo = formData.options.sameAsBilling 
                ? customerInfo.address 
                : {
                    line1: formData.shipping.address,
                    line2: formData.shipping.addressDetails || undefined,
                    city: formData.shipping.city,
                    postal_code: formData.shipping.postcode,
                    country: 'HR'
                };
            
            console.log('🚀 Making fetch request to:', workerUrl);
            
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    line_items: lineItems,
                    customer_info: customerInfo,
                    shipping_info: shippingInfo,
                    metadata: {
                        orderId: Date.now().toString(),
                        userId: this.currentUser?.uid || 'guest',
                        customerData: JSON.stringify(formData)
                    }
                })
            });
            
            console.log('📡 Response status:', response.status);
            console.log('📡 Response OK:', response.ok);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const { sessionId } = await response.json();
            
            // Create order in Firebase before redirecting to Stripe
            const orderId = await this.createOrder(formData, cartItems, sessionId);
            console.log('📋 Order created with ID:', orderId);
            
            // Store cart data temporarily in case user comes back from Stripe
            localStorage.setItem('pendingCheckout', 'true');
            
            // Re-enable buttons and hide spinners just before redirecting to Stripe
            loadingElements.forEach(({ button, loading, text }) => {
                button.disabled = false;
                loading.style.display = 'none';
                text.style.visibility = 'visible';
            });
            
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

    async findExistingPendingOrder() {
        if (!this.db || !this.currentUser) {
            return null;
        }

        try {
            console.log('🔍 Checking for existing pending orders for user:', this.currentUser.uid);
            
            // Query orders that match the user's UID and are pending payment
            const ordersQuery = this.db.collection('orders')
                .where('customerId', '==', this.currentUser.uid)
                .where('status', '==', 'pending_payment')
                .orderBy('createdAt', 'desc')
                .limit(1);

            const querySnapshot = await ordersQuery.get();

            if (!querySnapshot.empty) {
                const orderDoc = querySnapshot.docs[0];
                const orderData = orderDoc.data();
                console.log('📋 Found existing pending order:', {
                    orderId: orderDoc.id,
                    customerId: orderData.customerId,
                    status: orderData.status,
                    orderNumber: orderData.orderNumber
                });
                return orderDoc;
            } else {
                console.log('📋 No existing pending order found');
                return null;
            }
        } catch (error) {
            console.error('❌ Error checking existing orders:', error);
            return null;
        }
    }

    async createOrder(formData, cartItems, stripeSessionId) {
        if (!this.db) {
            console.warn('Firebase not available, skipping order creation');
            return null;
        }

        if (!this.currentUser) {
            console.error('❌ No authenticated user found for order creation');
            throw new Error('User must be authenticated to create an order');
        }

        try {
            // Check if there's an existing pending order for this user
            const existingOrder = await this.findExistingPendingOrder();
            let orderId, orderNumber, isUpdatingExisting = false;

            if (existingOrder) {
                // Update existing order
                orderId = existingOrder.id;
                orderNumber = existingOrder.data().orderNumber;
                isUpdatingExisting = true;
                console.log('📝 Updating existing order:', { orderId, orderNumber, customerId: this.currentUser.uid });
            } else {
                // Create new order
                orderId = Date.now().toString();
                orderNumber = await this.getNextOrderNumber();
                console.log('📝 Creating new order:', { orderId, orderNumber, customerId: this.currentUser.uid });
            }
            
            // Transform cart items to order format
            const orderItems = cartItems.map(item => ({
                productId: item.productId || '',
                variantId: item.variantId || '',
                productName: item.product?.name || '',
                variantSku: `${item.product?.name || ''}-${item.variant?.size || ''}-${item.variant?.color || ''}`, // Generate SKU
                size: item.variant?.size || '',
                color: item.variant?.color || '',
                quantity: item.quantity || 0,
                unitPrice: item.variant?.price || 0, // Price in cents
                totalPrice: (item.variant?.price || 0) * (item.quantity || 0),
                productImage: item.product?.images?.[0] || '' // Include first product image
            }));

            // Calculate totals
            const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
            const tax = 0; // Default to 0 as specified
            const shipping = 0; // Free shipping in Croatia
            const total = subtotal + tax + shipping;

            // Create order object - ensure no undefined values
            const order = {
                // Order identification
                orderId: orderId,
                orderNumber: orderNumber,
                
                // Customer information
                customerId: this.currentUser.uid, // Always available since we ensure user is authenticated
                customerEmail: formData.billing?.email || '',
                isAnonymous: this.currentUser.isAnonymous, // Track if this was an anonymous user
                
                // Order status
                status: 'pending_payment',
                paymentStatus: 'pending',
                
                // Items and pricing
                items: orderItems,
                subtotal: subtotal,
                tax: tax,
                shipping: shipping,
                total: total,
                currency: 'EUR',
                
                // Customer details
                billing: {
                    firstName: formData.billing?.firstName || '',
                    lastName: formData.billing?.lastName || '',
                    email: formData.billing?.email || '',
                    phone: formData.billing?.phone || '',
                    address: formData.billing?.address || '',
                    addressDetails: formData.billing?.addressDetails || '',
                    city: formData.billing?.city || '',
                    postcode: formData.billing?.postcode || '',
                    country: formData.billing?.country || ''
                },
                
                // Payment information
                stripeSessionId: stripeSessionId,
                
                // Timestamps
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                
                // Additional fields
                notes: ''
            };

            // Add shipping address only if different from billing
            if (formData.shipping) {
                order.shipping = {
                    firstName: formData.shipping.firstName || '',
                    lastName: formData.shipping.lastName || '',
                    phone: formData.shipping.phone || '',
                    address: formData.shipping.address || '',
                    addressDetails: formData.shipping.addressDetails || '',
                    city: formData.shipping.city || '',
                    postcode: formData.shipping.postcode || '',
                    country: formData.shipping.country || ''
                };
            } else {
                order.shipping = null;
            }

            // Add company details only if provided
            if (formData.company && (formData.company.name || formData.company.vatId)) {
                order.company = {
                    name: formData.company.name || '',
                    vatId: formData.company.vatId || ''
                };
            } else {
                order.company = null;
            }

            // Add fulfillment tracking
            order.fulfillment = {
                status: 'pending',
                trackingNumber: null,
                shippedAt: null,
                deliveredAt: null
            };

            // No need for guest session tokens since we use Firebase Anonymous Auth

            // Save order to Firestore
            if (isUpdatingExisting) {
                // Update existing order (preserve createdAt, update updatedAt)
                delete order.createdAt; // Don't overwrite the original creation date
                console.log('🔄 Updating Firebase order:', {
                    orderId: orderId,
                    customerId: this.currentUser.uid,
                    isAnonymous: this.currentUser.isAnonymous,
                    userEmail: this.currentUser.email || 'Anonymous'
                });
                
                await this.db.collection('orders').doc(orderId).update(order);
                console.log('✅ Order updated successfully:', orderId);
            } else {
                // Create new order
                console.log('🔄 Creating Firebase order:', {
                    orderId: orderId,
                    customerId: this.currentUser.uid,
                    isAnonymous: this.currentUser.isAnonymous,
                    userEmail: this.currentUser.email || 'Anonymous'
                });
                
                await this.db.collection('orders').doc(orderId).set(order);
                console.log('✅ Order created successfully:', orderId);
            }
            
            return orderId;
            
        } catch (error) {
            console.error('❌ Error creating order:', error);
            throw error;
        }
    }

    async getNextOrderNumber() {
        try {
            const counterRef = this.db.collection('orderNumbers').doc('counter');
            
            // Use a transaction to safely increment the counter
            const result = await this.db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                
                if (!counterDoc.exists) {
                    // Initialize counter if it doesn't exist
                    const initialNumber = 1000; // Start from 1000
                    transaction.set(counterRef, { next: initialNumber + 1 });
                    return initialNumber;
                } else {
                    const currentNext = counterDoc.data().next;
                    transaction.update(counterRef, { next: currentNext + 1 });
                    return currentNext;
                }
            });
            
            return result;
            
        } catch (error) {
            console.error('❌ Error getting order number:', error);
            // Fallback to timestamp-based number if counter fails
            return parseInt(Date.now().toString().slice(-6));
        }
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



    checkPendingCheckout() {
        // Check if user was redirected back from Stripe
        const pendingCheckout = localStorage.getItem('pendingCheckout');
        if (pendingCheckout === 'true') {
            console.log('👤 User returned from Stripe checkout, resetting loading state');
            
            // Clear the pending flag
            localStorage.removeItem('pendingCheckout');
            
            // Reset loading state on all pay buttons
            const payButtons = [
                document.getElementById('placeOrderBtn'),
                document.getElementById('mobilePayBtn')
            ];
            
            payButtons.forEach(button => {
                if (button) {
                    const textElement = button.querySelector('span');
                    const loadingElement = button.querySelector('.order-loading');
                    
                    if (textElement) textElement.style.visibility = 'visible';
                    if (loadingElement) loadingElement.style.display = 'none';
                    button.disabled = false;
                }
            });
        }
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