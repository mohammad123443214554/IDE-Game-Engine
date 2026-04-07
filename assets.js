// Asset management system
const AssetManager = {
    textures: new Map(),
    models: new Map(),
    sounds: new Map(),
    
    async loadTexture(url) {
        const loader = new THREE.TextureLoader();
        return new Promise((resolve) => {
            loader.load(url, (texture) => {
                this.textures.set(url, texture);
                resolve(texture);
            });
        });
    },
    
    createProceduralTexture(type, params) {
        const canvas = document.createElement('canvas');
        canvas.width = params.width || 256;
        canvas.height = params.height || 256;
        const ctx = canvas.getContext('2d');
        
        switch(type) {
            case 'grid':
                ctx.fillStyle = params.bg || '#21262d';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = params.color || '#58a6ff';
                ctx.lineWidth = 2;
                const step = params.step || 32;
                for (let i = 0; i < canvas.width; i += step) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0);
                    ctx.lineTo(i, canvas.height);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(0, i);
                    ctx.lineTo(canvas.width, i);
                    ctx.stroke();
                }
                break;
                
            case 'noise':
                for (let i = 0; i < canvas.width; i++) {
                    for (let j = 0; j < canvas.height; j++) {
                        const val = Math.random() * 255;
                        ctx.fillStyle = `rgb(${val},${val},${val})`;
                        ctx.fillRect(i, j, 1, 1);
                    }
                }
                break;
                
            case 'gradient':
                const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                grd.addColorStop(0, params.color1 || '#58a6ff');
                grd.addColorStop(1, params.color2 || '#a371f7');
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                break;
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
};
