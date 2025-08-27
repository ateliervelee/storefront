// Product Management Constants
const PRODUCT_CONSTANTS = {
    // Base URL for product images
    imageBaseUrl: 'https://raw.githubusercontent.com/ateliervelee/storefront/refs/heads/main/assets/images/',
    
    // Image index JSON URL
    imageIndexUrl: 'https://raw.githubusercontent.com/ateliervelee/storefront/refs/heads/main/assets/images/index.json',
    categories: [
        { value: 'dress', label: 'Dresses' },
        { value: 'top', label: 'Tops' },
        { value: 'bottom', label: 'Bottoms' },
        { value: 'outerwear', label: 'Outerwear' },
        { value: 'accessory', label: 'Accessories' },
        { value: 'footwear', label: 'Footwear' }
    ],
    
    sizes: [
        { value: 'XS', label: 'Extra Small' },
        { value: 'S', label: 'Small' },
        { value: 'M', label: 'Medium' },
        { value: 'L', label: 'Large' },
        { value: 'XL', label: 'Extra Large' },
        { value: 'XXL', label: '2X Large' }
    ],
    
    colors: [
        { value: 'black', label: 'Black' },
        { value: 'white', label: 'White' },
        { value: 'navy', label: 'Navy' },
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' },
        { value: 'green', label: 'Green' },
        { value: 'pink', label: 'Pink' },
        { value: 'beige', label: 'Beige' },
        { value: 'brown', label: 'Brown' },
        { value: 'gray', label: 'Gray' },
        { value: 'gold', label: 'Gold' },
        { value: 'yellow', label: 'Yellow' },
        { value: 'silver', label: 'Silver' }
    ],
    
    currencies: [
        { value: 'EUR', label: 'EUR (€)' },
        { value: 'USD', label: 'USD ($)' },
        { value: 'GBP', label: 'GBP (£)' }
    ],
    
    statuses: [
        { value: 'active', label: 'Active' },
        { value: 'draft', label: 'Draft' },
        { value: 'archived', label: 'Archived' }
    ],
    
    // Countries and delivery (will be replaced with Firebase data later)
    countries: [
        {
            code: 'HR',
            name: 'Croatia',
            deliveryFee: 0.00, // Free delivery in Croatia
            currency: 'EUR'
        }
        // More countries will be added via Firebase later
    ],
    
    // Order statuses
    orderStatuses: [
        { value: 'pending_payment', label: 'Pending Payment' },
        { value: 'payment_success', label: 'Payment Successful' },
        { value: 'processing', label: 'Processing' },
        { value: 'shipped', label: 'Shipped' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'refunded', label: 'Refunded' },
        { value: 'failed', label: 'Failed' }
    ],
    
    // Payment statuses
    paymentStatuses: [
        { value: 'pending', label: 'Pending' },
        { value: 'paid', label: 'Paid' },
        { value: 'failed', label: 'Failed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'refunded', label: 'Refunded' }
    ]
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRODUCT_CONSTANTS;
} else {
    window.PRODUCT_CONSTANTS = PRODUCT_CONSTANTS;
} 