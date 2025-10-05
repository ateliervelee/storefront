// Product Management Constants
const PRODUCT_CONSTANTS = {
    // Base URL for product images
    imageBaseUrl: 'https://raw.githubusercontent.com/ateliervelee/storefront/refs/heads/main/assets/images/',
    
    // Image index JSON URL
    imageIndexUrl: 'https://raw.githubusercontent.com/ateliervelee/storefront/refs/heads/main/assets/images/index.json',
    categories: [
        { value: 'dress', label: 'Haljine' },
        { value: 'top', label: 'Tops' },
        { value: 'bottom', label: 'Bottoms' },
        { value: 'bags', label: 'Torbe' },
        //{ value: 'accessory', label: 'Dodaci' },
        //{ value: 'footwear', label: 'Obuća' }
    ],
    
    sizes: [
        { value: 'XXS', label: 'XXS' },
        { value: 'XS', label: 'XS' },
        { value: 'S', label: 'S' },
        { value: 'M', label: 'M' },
        { value: 'L', label: 'L' },
        { value: 'XL', label: 'XL' },
        { value: 'XXL', label: 'XXL' }
    ],
    
    colors: [
        { value: 'black', label: 'Crno' },
        { value: 'white', label: 'Bijelo' },
        { value: 'navy', label: 'Navy' },
        { value: 'red', label: 'Crveno' },
        { value: 'blue', label: 'Plavo' },
        { value: 'green', label: 'Zeleno' },
        { value: 'pink', label: 'Rozo' },
        { value: 'beige', label: 'Bež' },
        { value: 'brown', label: 'Smeđe' },
        { value: 'gray', label: 'Sivo' },
        { value: 'gold', label: 'Zlatno' },
        { value: 'yellow', label: 'Žuto' },
        { value: 'silver', label: 'Srebrno' }
    ],
    
    currencies: [
        { value: 'EUR', label: 'EUR (€)' },
    ],
    
    statuses: [
        { value: 'active', label: 'Aktivno' },
        { value: 'draft', label: 'U izradi' },
        { value: 'archived', label: 'Arhivirano' }
    ],
    
    // Countries and delivery (will be replaced with Firebase data later)
    countries: [
        {
            code: 'HR',
            name: 'Croatia',
            deliveryFee: 10.00, // Free delivery in Croatia
            currency: 'EUR'
        }
        // More countries will be added via Firebase later
    ],
    
    // Order statuses
    orderStatuses: [
        { value: 'pending_payment', label: 'Potrebno plaćanje' },
        { value: 'payment_success', label: 'Uplaćeno' },
        { value: 'processing', label: 'Obrađuje se' },
        { value: 'shipped', label: 'Poslano' },
        { value: 'delivered', label: 'Dostavljeno' },
        { value: 'cancelled', label: 'Odustalo' },
        { value: 'refunded', label: 'Vraćena uplata' },
        { value: 'failed', label: 'Neuspješno' }
    ],
    
    // Payment statuses
    paymentStatuses: [
        { value: 'pending', label: 'Potrebno plaćanje' },
        { value: 'paid', label: 'Plaćeno' },
        { value: 'failed', label: 'Neuspješno' },
        { value: 'cancelled', label: 'Odustalo' },
        { value: 'refunded', label: 'Vraćena uplata' }
    ]
};

// Reusable color hex map for swatches across admin/storefront
const PRODUCT_COLOR_HEX_MAP = {
    black: '#000000',
    white: '#ffffff',
    navy: '#001f3f',
    red: '#dc3545',
    blue: '#007bff',
    green: '#28a745',
    pink: '#e91e63',
    beige: '#f5f5dc',
    brown: '#8b4513',
    gray: '#6c757d',
    grey: '#6c757d',
    gold: '#ffd700',
    yellow: '#ffeb3b',
    silver: '#c0c0c0'
};

// Attach to PRODUCT_CONSTANTS for convenient access
PRODUCT_CONSTANTS.colorHexMap = PRODUCT_COLOR_HEX_MAP;

// Cart and Storage Constants
const STORAGE_CONSTANTS = {
    cartKey: 'ateliervelee_cart',
    pendingOrderKey: 'pendingOrder',
    pendingFormDataKey: 'pendingFormData',
    pendingCheckoutKey: 'pendingCheckout',
    stripeSessionIdKey: 'stripeSessionId',
    checkoutSessionIdKey: 'checkoutSessionId'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PRODUCT_CONSTANTS, STORAGE_CONSTANTS, PRODUCT_COLOR_HEX_MAP };
} else {
    window.PRODUCT_CONSTANTS = PRODUCT_CONSTANTS;
    window.STORAGE_CONSTANTS = STORAGE_CONSTANTS;
    window.PRODUCT_COLOR_HEX_MAP = PRODUCT_COLOR_HEX_MAP;
} 