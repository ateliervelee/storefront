// Main Script Loader
// This file loads all scripts in the correct order

class ScriptLoader {
    constructor() {
        this.scripts = [
            // Firebase SDK (load first)
            {
                src: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
                async: false,
                defer: false
            },
            {
                src: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
                async: false,
                defer: false
            },
            {
                src: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
                async: false,
                defer: false
            },
            {
                src: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js',
                async: false,
                defer: false
            },
            {
                src: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics-compat.js',
                async: false,
                defer: false
            },
            // Our custom scripts
            {
                src: 'firebase-config.js',
                async: false,
                defer: false
            },
            {
                src: 'script.js',
                async: false,
                defer: false
            }
        ];
        
        this.loadedScripts = 0;
        this.totalScripts = this.scripts.length;
    }

    loadScript(scriptConfig) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptConfig.src;
            script.async = scriptConfig.async || false;
            script.defer = scriptConfig.defer || false;
            
            script.onload = () => {
                this.loadedScripts++;
                console.log(`✅ Loaded: ${scriptConfig.src} (${this.loadedScripts}/${this.totalScripts})`);
                resolve();
            };
            
            script.onerror = () => {
                console.error(`❌ Failed to load: ${scriptConfig.src}`);
                reject(new Error(`Failed to load ${scriptConfig.src}`));
            };
            
            document.head.appendChild(script);
        });
    }

    async loadAllScripts() {
        console.log('🚀 Starting script loading sequence...');
        
        try {
            // Load scripts sequentially to ensure proper order
            for (const scriptConfig of this.scripts) {
                await this.loadScript(scriptConfig);
            }
            
            console.log('🎉 All scripts loaded successfully!');
            
            // Trigger a custom event when all scripts are loaded
            document.dispatchEvent(new CustomEvent('allScriptsLoaded'));
            
        } catch (error) {
            console.error('💥 Script loading failed:', error);
        }
    }
}

// Initialize and start loading when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const loader = new ScriptLoader();
    loader.loadAllScripts();
}); 