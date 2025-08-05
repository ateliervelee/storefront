// Product Management Constants
const PRODUCT_CONSTANTS = {
    currencies: [
        { value: 'EUR', label: 'Euro (EUR)' },
        { value: 'USD', label: 'US Dollar (USD)' },
        { value: 'GBP', label: 'British Pound (GBP)' }
    ],
    
    categories: [
        { value: 'dress', label: 'Dress' },
        { value: 'bag', label: 'Bag' },
        { value: 'shoes', label: 'Shoes' },
        { value: 'accessories', label: 'Accessories' },
        { value: 'jewelry', label: 'Jewelry' }
    ],
    
    sizes: [
        { value: 'XS', label: 'XS' },
        { value: 'S', label: 'S' },
        { value: 'M', label: 'M' },
        { value: 'L', label: 'L' },
        { value: 'XL', label: 'XL' },
        { value: 'XXL', label: 'XXL' },
        { value: 'ONE_SIZE', label: 'One Size' }
    ],
    
    colors: [
        { value: 'black', label: 'Black' },
        { value: 'white', label: 'White' },
        { value: 'red', label: 'Red' },
        { value: 'navy', label: 'Navy' },
        { value: 'blue', label: 'Blue' },
        { value: 'green', label: 'Green' },
        { value: 'yellow', label: 'Yellow' },
        { value: 'pink', label: 'Pink' },
        { value: 'purple', label: 'Purple' },
        { value: 'orange', label: 'Orange' },
        { value: 'brown', label: 'Brown' },
        { value: 'gray', label: 'Gray' },
        { value: 'beige', label: 'Beige' },
        { value: 'cream', label: 'Cream' },
        { value: 'gold', label: 'Gold' },
        { value: 'silver', label: 'Silver' }
    ],
    
    statuses: [
        { value: 'public', label: 'Public' },
        { value: 'draft', label: 'Draft' },
        { value: 'archived', label: 'Archived' }
    ]
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRODUCT_CONSTANTS;
} else {
    window.PRODUCT_CONSTANTS = PRODUCT_CONSTANTS;
} 