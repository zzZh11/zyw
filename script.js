class KeyboardArtist {
    constructor() {
        // DOM元素
        this.canvas = document.getElementById('art-container');
        this.hint = document.querySelector('.hint');
        this.elementCount = document.getElementById('element-count');
        this.zoomLevel = document.getElementById('zoom-level');
        
        // 控制面板元素
        this.shapeSelect = document.getElementById('shape-select');
        this.animationSelect = document.getElementById('animation-select');
        this.colorSelect = document.getElementById('color-select');
        this.customColor = document.getElementById('custom-color');
        this.sizeRange = document.getElementById('size-range');
        this.saveBtn = document.getElementById('save-btn');
        this.shareBtn = document.getElementById('share-btn');
        
        // 背景色（用于排除相似颜色）
        this.backgroundColor = "#0a0a0a";
        this.backgroundRgb = this.hexToRgb(this.backgroundColor);
        
        // 状态管理
        this.elements = [];
        this.isFirstKey = true;
        this.styleCounter = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        // 配置选项
        this.shapes = [
            'shape-circle',
            'shape-square',
            'shape-rounded',
            'shape-triangle',
            'shape-star',
            'shape-heart',
            'shape-diamond'
        ];
        
        this.animations = [
            'animation-breathe',
            'animation-rotate',
            'animation-float',
            'animation-pulse',
            'animation-spin',
            'animation-wobble',
            ''
        ];
        
        // 颜色方案 - 排除与背景色相近的颜色
        this.colorSchemes = {
            pastel: [
                '#FFD1DC', '#C8A2C8', '#B5EAD7', '#FFDAC1', '#E2F0CB',
                '#FDFFB6', '#CBF0F8', '#DEEEFF', '#F9F2FF', '#FFE5E5'
            ],
            vibrant: [
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#DDA0DD',
                '#FF6B9D', '#FFD93D', '#6BCB77', '#C44569', '#00D2D3'
            ],
            dark: [
                // 深色系中排除了最暗的接近黑色的颜色
                '#7395AE', '#557A95', '#B1A296', '#6F4E37', 
                '#9772FB', '#B24592', '#F15025', '#0B486B'
            ]
        };
        
        this.init();
    }
    
    init() {
        // 事件监听
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        window.addEventListener('resize', () => this.handleResize());
        this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        document.addEventListener('mouseleave', () => this.stopDrag());
        
        // 按钮事件
        this.saveBtn.addEventListener('click', () => this.saveArtwork());
        this.shareBtn.addEventListener('click', () => this.shareArtwork());
        
        // 初始化画布变换
        this.updateCanvasTransform();
        this.updateElementCount();
    }
    
    handleKeyPress(event) {
        // 防止重复触发
        if (event.repeat) return;
        
        const key = event.key;
        
        // 控制画布
        switch(key) {
            case 'ArrowUp':
                this.offsetY += 20 / this.scale;
                this.updateCanvasTransform();
                event.preventDefault();
                return;
            case 'ArrowDown':
                this.offsetY -= 20 / this.scale;
                this.updateCanvasTransform();
                event.preventDefault();
                return;
            case 'ArrowLeft':
                this.offsetX += 20 / this.scale;
                this.updateCanvasTransform();
                event.preventDefault();
                return;
            case 'ArrowRight':
                this.offsetX -= 20 / this.scale;
                this.updateCanvasTransform();
                event.preventDefault();
                return;
            case '+':
            case '=':
                this.scale = Math.min(this.scale * 1.1, 3);
                this.updateCanvasTransform();
                event.preventDefault();
                return;
            case '-':
                this.scale = Math.max(this.scale / 1.1, 0.3);
                this.updateCanvasTransform();
                event.preventDefault();
                return;
        }
        
        // 清空画布 - 只保留ESC作为清除键
        if (key === 'Escape') {
            this.clearCanvas();
            return;
        }
        
        // 忽略功能键（除了Enter和空格）
        if (key.length > 1 && !['Enter', ' '].includes(key)) {
            return;
        }
        
        // 隐藏提示文字
        if (this.isFirstKey) {
            this.hint.classList.add('hidden');
            this.isFirstKey = false;
        }
        
        // 创建艺术元素 - 按C键时显示"张议文"
        let displayText = key;
        if (key.toLowerCase() === 'c') {
            displayText = '张议文';
        } else if (key === ' ') {
            displayText = 'Space';
        }
        
        this.createArtElement(displayText);
    }
    
    // 检查颜色是否与背景色太接近
    isColorTooDark(rgb) {
        // 使用CIE76色差公式检查颜色差异
        const deltaR = rgb.r - this.backgroundRgb.r;
        const deltaG = rgb.g - this.backgroundRgb.g;
        const deltaB = rgb.b - this.backgroundRgb.b;
        const distance = Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
        
        // 阈值小于30的颜色被视为太暗（与背景太接近）
        return distance < 30;
    }
    
    // 生成随机渐变
    getRandomGradient() {
        // 随机选择2-3种颜色
        const colorCount = Math.random() > 0.5 ? 2 : 3;
        const colors = [];
        
        // 根据颜色选择器获取颜色范围
        let colorPool;
        switch(this.colorSelect.value) {
            case 'random':
                colorPool = [
                    ...this.colorSchemes.pastel,
                    ...this.colorSchemes.vibrant,
                    ...this.colorSchemes.dark
                ];
                break;
            case 'custom':
                // 自定义颜色时，生成基于该颜色的渐变
                const baseColor = this.customColor.value;
                return this.getCustomColorGradient(baseColor);
            default:
                colorPool = this.colorSchemes[this.colorSelect.value] || this.colorSchemes.pastel;
        }
        
        // 从颜色池中随机选择颜色，确保不与背景色太接近
        for (let i = 0; i < colorCount; i++) {
            let randomIndex, color, rgb;
            // 最多尝试10次找到合适的颜色
            for (let attempt = 0; attempt < 10; attempt++) {
                randomIndex = Math.floor(Math.random() * colorPool.length);
                color = colorPool[randomIndex];
                rgb = this.hexToRgb(color);
                if (rgb && !this.isColorTooDark(rgb)) {
                    break;
                }
            }
            colors.push(color);
        }
        
        // 随机渐变角度
        const angle = Math.floor(Math.random() * 360);
        
        // 构建渐变字符串
        return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
    }
    
    // 基于自定义颜色生成渐变
    getCustomColorGradient(baseColor) {
        // 转换为RGB
        const rgb = this.hexToRgb(baseColor);
        if (!rgb) return baseColor;
        
        // 检查自定义颜色是否太暗，如果太暗则调整
        if (this.isColorTooDark(rgb)) {
            // 提亮颜色
            const factor = 1.5; // 增加亮度的因子
            const newR = Math.min(255, Math.round(rgb.r * factor));
            const newG = Math.min(255, Math.round(rgb.g * factor));
            const newB = Math.min(255, Math.round(rgb.b * factor));
            return this.rgbToHex(newR, newG, newB);
        }
        
        // 创建2-3个基于基色的变体
        const colors = [baseColor];
        const variants = Math.random() > 0.5 ? 1 : 2;
        
        for (let i = 0; i < variants; i++) {
            // 随机调整亮度和饱和度，但确保不会太暗
            let newR, newG, newB;
            for (let attempt = 0; attempt < 10; attempt++) {
                const factor = 0.3 + Math.random() * 0.7; // 0.3-1.0
                newR = Math.min(255, Math.round(rgb.r + (Math.random() > 0.5 ? 1 : -1) * rgb.r * factor));
                newG = Math.min(255, Math.round(rgb.g + (Math.random() > 0.5 ? 1 : -1) * rgb.g * factor));
                newB = Math.min(255, Math.round(rgb.b + (Math.random() > 0.5 ? 1 : -1) * rgb.b * factor));
                
                // 确保新颜色不会太暗
                if (!this.isColorTooDark({r: newR, g: newG, b: newB})) {
                    break;
                }
            }
            
            colors.push(this.rgbToHex(newR, newG, newB));
        }
        
        // 随机角度
        const angle = Math.floor(Math.random() * 360);
        return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
    }
    
    // 辅助函数：十六进制转RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    // 辅助函数：RGB转十六进制
    rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    createArtElement(key) {
        const element = document.createElement('div');
        element.className = 'art-element';
        
        // 基于当前视口计算随机位置
        const viewportWidth = window.innerWidth / this.scale;
        const viewportHeight = window.innerHeight / this.scale;
        const x = this.offsetX + Math.random() * (viewportWidth - 100);
        const y = this.offsetY + Math.random() * (viewportHeight - 100);
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        
        // 基于滑块设置大小
        const baseSize = parseInt(this.sizeRange.value);
        const size = Math.random() * baseSize + baseSize / 2; // 50% - 150% 的基准大小
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
        
        // 选择形状
        let shape;
        if (this.shapeSelect.value === 'random') {
            shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
        } else {
            shape = this.shapeSelect.value;
        }
        element.classList.add(shape);
        
        // 获取随机渐变
        const gradient = this.getRandomGradient();
        
        // 为不同形状应用渐变 - 修复特殊形状
        if (shape === 'shape-triangle') {
            // 三角形 - 使用clip-path，直接应用渐变
            element.style.background = gradient;
            element.textContent = key;
        } else if (shape === 'shape-star') {
            // 星形 - 直接应用渐变
            element.style.background = gradient;
            element.textContent = key;
        } else if (shape === 'shape-heart') {
            // 心形 - 使用动态样式
            this.addDynamicStyle(shape, gradient);
            element.textContent = key;
        } else {
            // 其他形状直接应用渐变
            element.style.background = gradient;
            element.textContent = key;
        }
        
        // 选择动画
        let animation;
        if (this.animationSelect.value === 'random') {
            animation = this.animations[Math.floor(Math.random() * this.animations.length)];
        } else {
            animation = this.animationSelect.value;
        }
        if (animation) {
            element.classList.add(animation);
        }
        
        // 添加点击事件（带粒子效果）
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.createParticles(element);
            this.removeElement(element);
        });
        
        // 添加到画布
        this.canvas.appendChild(element);
        this.elements.push(element);
        this.updateElementCount();
        
        // 自动清理过多元素（性能优化）
        if (this.elements.length > 150) {
            const oldestElement = this.elements.shift();
            this.removeElement(oldestElement);
        }
    }
    
    addDynamicStyle(shape, gradient) {
        const styleId = `dynamic-style-${this.styleCounter++}`;
        let styleContent = '';
        
        if (shape === 'shape-heart') {
            styleContent = `
                .shape-heart[data-id="${this.styleCounter}"]:before, 
                .shape-heart[data-id="${this.styleCounter}"]:after { 
                    background: ${gradient}; 
                }
            `;
        }
        
        if (styleContent) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = styleContent;
            document.head.appendChild(style);
            
            // 为元素添加data-id属性
            const elements = document.querySelectorAll(`.${shape}:not([data-id])`);
            if (elements.length > 0) {
                elements[elements.length - 1].setAttribute('data-id', this.styleCounter);
            }
        }
    }
    
    removeElement(element) {
        if (!element || element.classList.contains('removing')) return;
        
        element.classList.add('removing');
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
                const index = this.elements.indexOf(element);
                if (index > -1) {
                    this.elements.splice(index, 1);
                }
                this.updateElementCount();
                
                // 如果清空了，显示提示
                if (this.elements.length === 0) {
                    this.hint.classList.remove('hidden');
                    this.isFirstKey = true;
                }
            }
        }, 300);
    }
    
    clearCanvas() {
        // 添加清除动画效果
        this.elements.forEach(element => {
            this.createParticles(element);
            this.removeElement(element);
        });
    }
    
    // 创建泡泡风格的粒子效果
    createParticles(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        // 获取元素的主要颜色
        const style = getComputedStyle(element);
        let color = style.backgroundColor || style.borderBottomColor;
        
        // 如果是渐变，提取第一个颜色
        if (color.includes('gradient')) {
            // 尝试从渐变字符串中提取第一个颜色
            const gradientColors = color.match(/#[0-9a-fA-F]{6}/g);
            if (gradientColors && gradientColors.length > 0) {
                color = gradientColors[0];
            } else {
                color = '#ffffff'; //  fallback
            }
        }
        
        // 创建更多粒子，模拟泡泡破裂效果
        const particleCount = 15 + Math.floor(Math.random() * 10); // 15-25个粒子
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // 随机粒子大小（泡泡大小变化）
            const size = Math.random() * 12 + 4;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // 位置在元素中心
            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;
            particle.style.backgroundColor = color;
            // 泡泡半透明效果
            particle.style.opacity = (0.4 + Math.random() * 0.6).toString();
            
            document.body.appendChild(particle);
            
            // 随机动画路径（模拟泡泡飞溅）
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 60 + 30;
            const duration = Math.random() * 800 + 600;
            // 随机添加一些上下浮动，更像泡泡
            const floatOffset = (Math.random() - 0.5) * 20;
            
            // 应用动画
            setTimeout(() => {
                particle.style.transform = `translate(
                    ${Math.cos(angle) * distance}px, 
                    ${Math.sin(angle) * distance + floatOffset}px
                )`;
                particle.style.opacity = '0';
                // 缓动效果让泡泡动画更自然
                particle.style.transition = `
                    transform ${duration}ms cubic-bezier(0.17, 0.67, 0.83, 0.67), 
                    opacity ${duration * 0.8}ms ease-out
                `;
                
                // 动画结束后移除
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, duration);
            }, 10);
        }
    }
    
    updateElementCount() {
        this.elementCount.textContent = this.elements.length;
    }
    
    // 画布拖拽功能
    startDrag(e) {
        // 只有右键点击才拖拽画布
        if (e.button !== 2) return;
        
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        e.preventDefault(); // 防止右键菜单弹出
    }
    
    handleDrag(e) {
        if (!this.isDragging) return;
        
        const deltaX = (e.clientX - this.dragStartX) / this.scale;
        const deltaY = (e.clientY - this.dragStartY) / this.scale;
        
        this.offsetX += deltaX;
        this.offsetY += deltaY;
        
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        this.updateCanvasTransform();
    }
    
    stopDrag() {
        this.isDragging = false;
    }
    
    updateCanvasTransform() {
        this.canvas.style.transform = `translate(${-this.offsetX}px, ${-this.offsetY}px) scale(${this.scale})`;
        this.zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
    }
    
    handleResize() {
        this.updateCanvasTransform();
    }
    
    // 保存作品功能
    saveArtwork() {
        if (this.elements.length === 0) {
            alert('请先创建一些元素再保存！');
            return;
        }
        
        // 创建一个临时画布用于截图
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        
        // 设置画布大小
        tempCanvas.width = window.innerWidth;
        tempCanvas.height = window.innerHeight;
        
        // 绘制背景
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        alert('作品已准备好保存！(实际项目中这里会触发Canvas截图下载)');
        // 实际项目中，这里会使用html2canvas等库将元素绘制到canvas并下载
    }
    
    // 分享功能
    shareArtwork() {
        if (this.elements.length === 0) {
            alert('请先创建一些元素再分享！');
            return;
        }
        
        if (navigator.share) {
            navigator.share({
                title: '我的键盘绘画作品',
                text: '看看我用键盘绘画师创作的作品！',
                url: window.location.href
            }).catch(err => {
                console.log('分享失败:', err);
            });
        } else {
            // 复制链接到剪贴板
            navigator.clipboard.writeText(window.location.href)
                .then(() => alert('链接已复制到剪贴板，可以分享给朋友了！'))
                .catch(err => console.log('复制失败:', err));
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new KeyboardArtist();
    
    // 禁用右键菜单，因为右键用于拖拽
    document.addEventListener('contextmenu', e => e.preventDefault());
});