# Atelier Veleé - Luxury Fashion Landing Page

A sophisticated, fashion-forward landing page designed for Atelier Veleé, inspired by luxury editorial websites. The page communicates elegance, exclusivity, and minimalism while showcasing the brand's Spring/Summer collection.

## 🎨 Design Features

### Visual Aesthetic
- **Color Palette**: Warm neutrals, whites, and subtle golds/sands
- **Typography**: Elegant serif fonts (Playfair Display) for headers, clean sans-serif (Inter) for body text
- **Layout**: Asymmetrical but clean design with generous whitespace
- **Images**: Editorial style with soft lighting and luxurious settings

### Interactive Elements
- Subtle fade-in animations and parallax effects
- Smooth scroll transitions
- Responsive mobile navigation
- Dynamic button hover effects
- Image scaling on hover
- Newsletter form with validation

## 📱 Responsive Design

The website is fully responsive across all devices:
- **Desktop**: Full layout with all features
- **Tablet**: Adapted grid layouts and navigation
- **Mobile**: Hamburger menu and stacked content

## 🏗️ Structure

### 1. Hero Section
- Full-screen background image
- Brand title: "Atelier Veleé"
- Subtitle: "High Society Fashion"
- Call-to-action button
- Fixed navigation with smooth background transition

### 2. Fashion Week Section
- Vertical "Glamour" title (desktop only)
- Left-aligned text content
- Two-image grid showcase
- Editorial-style presentation

### 3. Feature Collection
- "Echoes of Opulence" title
- "Grandeur" subtitle
- Large hero image with accompanying text
- Collection exploration CTA

### 4. Seasonal Highlight
- "Spring/Summer /22" title
- Side-by-side image tiles
- Collection description and highlights
- "Find Out More" CTA

### 5. Newsletter Section
- "Keep In Touch" invitation
- Email subscription form (FormSubmit integration)
- Lifestyle imagery
- Form validation and feedback

### 6. Footer
- Brand information
- Navigation links
- Copyright notice

## 🚀 Technologies Used

- **HTML5**: Semantic markup structure
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript**: Interactive functionality and animations
- **Google Fonts**: Playfair Display & Inter typography
- **Unsplash**: High-quality editorial images
- **FormSubmit**: Newsletter form handling

## ⚡ Performance Features

- **Lazy Loading**: Images load as they enter viewport
- **Throttled Scroll Events**: Optimized performance during scrolling
- **CSS Variables**: Consistent theming and easy customization
- **Responsive Images**: Optimized for different screen sizes
- **Smooth Animations**: GPU-accelerated transforms

## 🛠️ Setup Instructions

1. **Clone or download** the project files
2. **Update the newsletter form**: 
   - Replace `your-email@domain.com` in the form action with your actual email
3. **Customize images**: 
   - Replace Unsplash URLs with your own images
   - Maintain aspect ratios for best results
4. **Favicon**: 
   - Favicon files are located in `assets/favicon/`
   - Created using [favicon.io](https://favicon.io)
5. **Open `index.html`** in your browser
6. **For production**: Upload to your web hosting service

## 📝 Customization

### Colors
Update CSS custom properties in `styles.css`:
```css
:root {
    --primary-cream: #F8F6F1;
    --warm-white: #FEFCF8;
    --muted-gold: #D4C5A0;
    /* ... other color variables ... */
}
```

### Typography
Change font imports in `index.html` and update CSS variables:
```css
:root {
    --font-serif: 'Your-Serif-Font', serif;
    --font-sans: 'Your-Sans-Font', sans-serif;
}
```

### Images
- Replace image URLs in `index.html`
- Use high-quality, editorial-style photography
- Recommended dimensions:
  - Hero: 2340x1316px (16:9)
  - Portrait: 1200x1600px (3:4)
  - Landscape: 1600x1200px (4:3)

### Content
- Update text content in `index.html`
- Modify section titles and descriptions
- Customize navigation links and footer information

## 🔧 JavaScript Features

- **Mobile Menu**: Hamburger navigation for mobile devices
- **Scroll Animations**: Elements fade in as they enter viewport
- **Parallax Effect**: Hero image moves with scroll
- **Navbar Enhancement**: Background appears on scroll
- **Form Handling**: Newsletter subscription with feedback
- **Accessibility**: Keyboard navigation and focus indicators
- **Performance**: Throttled scroll events and lazy loading
- **Component System**: Modular HTML components with automatic injection

## 🧩 Component System

The website uses a modular component system for better organization:

### Current Components
- **`footer.html`** - Site footer with brand and links

### How to Add Components
1. **Create Component File**: `header.html`, `nav.html`, etc.
2. **Add Placeholder**: `<header-placeholder></header-placeholder>`
3. **Load in JavaScript**: `await loadComponent('header.html', 'header-placeholder');`

### Benefits
- **Modular Development**: Separate concerns and reusable components
- **Easy Maintenance**: Update footer/header in one place
- **Clean Code**: Keeps index.html focused on structure
- **Scalability**: Easy to add navigation, headers, sidebars, etc.

## 🌐 Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For questions or support, please contact [your-email@domain.com]

---

**Built with ❤️ for luxury fashion brands** 