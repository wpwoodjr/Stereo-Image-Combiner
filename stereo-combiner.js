// ===================================
// CORE StereoImageCombiner MODULE - Main application state and initialization
// ===================================
class SIC {
    static BODY_BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--body-bg-color').trim();
    static GAP_TO_BORDER_RATIO = 1;
    static DEFAULT_SCALE = 100;
    static DEFAULT_GAP_PERCENT = 3.0;
    static DEFAULT_COLOR = '#000000';
    static DEFAULT_BORDERS = true;
    static DEFAULT_TRANSPARENT = false;
    static DEFAULT_CORNER_RADIUS = 0;
    static DEFAULT_FORMAT = 'image/jpeg';
    static DEFAULT_JPG_QUALITY = 90;

    // cropManager will be set by crop.js
    static cropManager = null;
    static domElements = SIC.initDOMElements();

    constructor() {
        this.images = [];
        this.imageNames = [];
        this.scale = 1;
        this.maxScale = 1;

        this.gapPercent = SIC.DEFAULT_GAP_PERCENT;
        this.hasBorders = SIC.DEFAULT_BORDERS;
        this.gapColor = SIC.DEFAULT_COLOR;
        this.isTransparent = SIC.DEFAULT_TRANSPARENT;
        this.cornerRadiusPercent = SIC.DEFAULT_CORNER_RADIUS;

        // initialize classes
        this.eventManager = new EventManager(this);
        this.renderer = new ImageRenderer(this);
        this.fileManager = new FileManager(this);
        this.uiManager = new UIManager(this);
        this.displayManager = new DisplayManager(this);
    }

    static initDOMElements() {
        return {
            dropzone: document.getElementById('dropzone'),
            dropzoneMessage: document.getElementById('dropzoneMessage'),
            canvas: document.getElementById('canvas'),
            canvasContainer: document.getElementById('canvasContainer'),
            scaleSlider: document.getElementById('scale'),
            scaleValue: document.getElementById('scaleValue'),
            gapSlider: document.getElementById('gap'),
            gapValue: document.getElementById('gapValue'),
            colorPicker: document.getElementById('color'),
            bordersCheckbox: document.getElementById('borders'),
            transparentCheckbox: document.getElementById('transparent'),
            cornerRadiusSlider: document.getElementById('cornerRadius'),
            cornerRadiusValue: document.getElementById('cornerRadiusValue'),
            saveButton: document.getElementById('save'),
            swapButton: document.getElementById('swap'),
            leftImageName: document.getElementById('leftImageName'),
            rightImageName: document.getElementById('rightImageName'),
            fileInput: document.getElementById('fileInput'),
            filenamePrefixInput: document.getElementById('filenamePrefix'),
            formatSelect: document.getElementById('format'),
            qualitySlider: document.getElementById('quality'),
            qualityValue: document.getElementById('qualityValue'),
            qualityContainer: document.getElementById('qualityContainer')
        };
    }
}

// ===================================
// EVENT MANAGER - Handles all event listeners
// ===================================
class EventManager {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.setupDropzoneEvents();
        this.setupControlEvents();
        this.setupCanvasEvents();
        this.setupKeyboardEvents();
    }

    setupDropzoneEvents() {
        const { dropzone, dropzoneMessage, fileInput } = SIC.domElements;
        
        dropzone.addEventListener('click', (e) => {
            if (e.target === dropzone || e.target === dropzoneMessage) {
                fileInput.click();
            }
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.backgroundColor = '#303030';
            dropzoneMessage.textContent = 'Drop images here';
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.style.backgroundColor = '#202020';
            dropzoneMessage.innerHTML = this.app.uiManager.getDropzoneMessageText();
        });

        dropzone.addEventListener('drop', (e) => {
            dropzoneMessage.innerHTML = this.app.uiManager.getDropzoneMessageText();
            e.preventDefault();
            dropzone.style.backgroundColor = '#202020';
            this.app.fileManager.processFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.app.fileManager.processFiles(e.target.files);
                fileInput.value = '';
            }
        });
    }

    setupControlEvents() {
        const elements = SIC.domElements;
        
        elements.scaleSlider.addEventListener('input', () => this.app.uiManager.updateScale());
        elements.gapSlider.addEventListener('input', () => this.app.uiManager.updateGap());
        elements.colorPicker.addEventListener('input', () => this.app.uiManager.updateColor());
        elements.bordersCheckbox.addEventListener('input', () => this.app.uiManager.updateBorders());
        elements.transparentCheckbox.addEventListener('input', () => this.app.uiManager.updateTransparent());
        elements.cornerRadiusSlider.addEventListener('input', () => this.app.uiManager.updateCornerRadius());
        elements.swapButton.addEventListener('click', () => this.app.uiManager.updateSwap());
        elements.saveButton.addEventListener('click', () => this.app.fileManager.saveImage());
        
        elements.filenamePrefixInput.addEventListener('input', function() {
            StorageManager.setItem('filenamePrefix', this.value);
        });

        elements.formatSelect.addEventListener('change', function() {
            elements.qualityContainer.style.display = this.value === 'image/jpeg' ? 'block' : 'none';
            StorageManager.setItem('fileFormat', this.value);
        });

        elements.qualitySlider.addEventListener('input', function() {
            elements.qualityValue.textContent = `${this.value}%`;
            StorageManager.setItem('jpgQuality', this.value);
        });
    }

    setupCanvasEvents() {
        const { canvasContainer, canvas, fileInput } = SIC.domElements;

        canvasContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            canvasContainer.style.opacity = '0.7';
        });

        canvasContainer.addEventListener('dragleave', () => {
            canvasContainer.style.opacity = '1';
        });

        canvasContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            canvasContainer.style.opacity = '1';
            this.app.fileManager.processFiles(e.dataTransfer.files);
        });

        canvasContainer.addEventListener('click', (e) => {
            if (SIC.cropManager.isCropping) return;
            if (e.target === canvas || e.target === canvasContainer) {
                fileInput.click();
            }
        });
    }

    setupKeyboardEvents() {
        window.addEventListener('keydown', (e) => {
            // Check if input element is focused
            if (document.activeElement.tagName === 'INPUT' || 
                document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case 'x':
                    this.app.uiManager.updateSwap();
                    e.preventDefault();
                    break;
                case 'f':
                    this.app.displayManager.toggleFullscreen();
                    e.preventDefault();
                    break;
                case '?':
                case '/':
                    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                        HelpManager.openHelp();
                        e.preventDefault();
                    }
                    break;
            }
        });
    }
}

// ===================================
// UI MANAGER - Handles UI updates and state
// ===================================
class UIManager {
    constructor(app) {
        this.app = app;
        this.setupInitialState();
    }

    setupInitialState() {
        // Set up dropzone message
        this.setupDropzoneMessage();
        
        // Disable buttons initially
        SIC.domElements.saveButton.disabled = true;
        SIC.domElements.swapButton.disabled = true;

        this.resetControlsToDefaults();
    }

    getDropzoneMessageText() {
        let text = "Drag and drop two images here or click to browse";
        if (window.matchMedia('(pointer: fine)').matches) {
            text += "<br><small>(Hold Ctrl or ⌘ while clicking to select both images)</small>";
        }
        return text;
    }

    setupDropzoneMessage() {
        SIC.domElements.dropzoneMessage.innerHTML = this.getDropzoneMessageText();
    }

    resetControlsToDefaults() {
        const elements = SIC.domElements;

        // Reset scale
        const uncroppedScalePercent = StorageManager.getItem('uncroppedScalePercent', SIC.DEFAULT_SCALE);
        this.app.renderer.setScalePercent(uncroppedScalePercent, 1);

        // Reset gap and borders
        this.app.gapPercent = StorageManager.getItem('gapPercent', SIC.DEFAULT_GAP_PERCENT);
        elements.gapSlider.value = this.app.gapPercent * 10;
        elements.gapValue.textContent = `${this.app.gapPercent.toFixed(1)}%`;
        this.app.hasBorders = StorageManager.getItem('hasBorders', SIC.DEFAULT_BORDERS);
        elements.bordersCheckbox.checked = this.app.hasBorders;

        // Reset color and transparency
        this.app.gapColor = StorageManager.getItem('gapColor', SIC.DEFAULT_COLOR);
        elements.colorPicker.value = this.app.gapColor;
        this.app.isTransparent = StorageManager.getItem('isTransparent', SIC.DEFAULT_TRANSPARENT);
        elements.transparentCheckbox.checked = this.app.isTransparent;
        this.updateColorPickerState();

        // Reset corner radius
        this.app.cornerRadiusPercent = StorageManager.getItem('cornerRadiusPercent', SIC.DEFAULT_CORNER_RADIUS);
        elements.cornerRadiusSlider.value = this.app.cornerRadiusPercent;
        elements.cornerRadiusValue.textContent = `${this.app.cornerRadiusPercent}%`;

        // Reset format and quality
        elements.filenamePrefixInput.value = StorageManager.getItem('filenamePrefix', '');
        elements.qualitySlider.value = StorageManager.getItem('jpgQuality', SIC.DEFAULT_JPG_QUALITY);
        elements.qualityValue.textContent = `${elements.qualitySlider.value}%`;
        elements.formatSelect.value = StorageManager.getItem('fileFormat', SIC.DEFAULT_FORMAT);
        elements.qualityContainer.style.display = elements.formatSelect.value === 'image/jpeg' ? 'block' : 'none';
    }

    updateScale() {
        const newScalePercent = parseInt(SIC.domElements.scaleSlider.value) / 100;

        if (SIC.cropManager.isCropping) {
            SIC.cropManager.onScaleChange(newScalePercent);
        } else {
            this.app.renderer.setScalePercent(newScalePercent);
            if (SIC.cropManager.isCropped) {
                StorageManager.setItem('croppedScalePercent', newScalePercent);
            } else {
                StorageManager.setItem('uncroppedScalePercent', newScalePercent);
            }
            this.app.renderer.drawImages();
        }
    }

    updateGap() {
        const sliderValue = parseInt(SIC.domElements.gapSlider.value);
        this.app.gapPercent = sliderValue / 10;
        StorageManager.setItem('gapPercent', this.app.gapPercent);
        SIC.domElements.gapValue.textContent = `${this.app.gapPercent.toFixed(1)}%`;

        if (this.app.images.length !== 2) return;

        if (SIC.cropManager.isCropping) {
            SIC.cropManager.onScaleChange(0);
        } else {
            const optimalScale = this.app.renderer.calculateMaxScale(this.app.images[0], this.app.images[1]);
            this.app.renderer.setScalePercent(this.app.scale / this.app.maxScale, optimalScale);
            this.app.renderer.drawImages();
        }
    }

    updateColor() {
        this.app.gapColor = SIC.domElements.colorPicker.value;
        StorageManager.setItem('gapColor', this.app.gapColor);
        if (SIC.cropManager.isCropping) {
            SIC.cropManager.drawCropInterface();
        } else {
            this.app.renderer.drawImages();
        }
    }

    updateBorders() {
        this.app.hasBorders = SIC.domElements.bordersCheckbox.checked;
        StorageManager.setItem('hasBorders', this.app.hasBorders);

        if (this.app.images.length !== 2) return;

        if (SIC.cropManager.isCropping) {
            SIC.cropManager.onScaleChange(0);
        } else {
            const optimalScale = this.app.renderer.calculateMaxScale(this.app.images[0], this.app.images[1]);
            this.app.renderer.setScalePercent(this.app.scale / this.app.maxScale, optimalScale);
            this.app.renderer.drawImages();
        }
    }

    updateTransparent() {
        this.app.isTransparent = SIC.domElements.transparentCheckbox.checked;
        StorageManager.setItem('isTransparent', this.app.isTransparent);
        this.updateColorPickerState();
        if (SIC.cropManager.isCropping) {
            SIC.cropManager.drawCropInterface();
        } else {
            this.app.renderer.drawImages();
        }
    }

    updateColorPickerState() {
        const colorPicker = SIC.domElements.colorPicker;
        const canvas = SIC.domElements.canvas;
        
        colorPicker.disabled = this.app.isTransparent;
        if (this.app.isTransparent) {
            colorPicker.style.opacity = '0.5';
            colorPicker.style.pointerEvents = 'none';
            colorPicker.style.filter = 'grayscale(1)';
            canvas.classList.add('transparent-bg');
        } else {
            colorPicker.style.opacity = '1';
            colorPicker.style.pointerEvents = 'auto';
            colorPicker.style.filter = 'none';
            canvas.classList.remove('transparent-bg');
        }
    }

    updateCornerRadius() {
        this.app.cornerRadiusPercent = parseInt(SIC.domElements.cornerRadiusSlider.value);
        StorageManager.setItem('cornerRadiusPercent', this.app.cornerRadiusPercent);
        SIC.domElements.cornerRadiusValue.textContent = `${this.app.cornerRadiusPercent}%`;
        if (SIC.cropManager.isCropping) {
            SIC.cropManager.drawCropInterface();
        } else {
            this.app.renderer.drawImages();
        }
    }

    updateSwap() {
        [this.app.images[0], this.app.images[1]] = [this.app.images[1], this.app.images[0]];
        [this.app.imageNames[0], this.app.imageNames[1]] = [this.app.imageNames[1], this.app.imageNames[0]];
        this.updateImageNames();
        SIC.cropManager.onSwap();
    }

    updateImageNames() {
        SIC.domElements.leftImageName.textContent = this.app.imageNames[0] || '';
        SIC.domElements.rightImageName.textContent = this.app.imageNames[1] || '';
    }
}

// ===================================
// FILE MANAGER - Handles file operations
// ===================================
class FileManager {
    constructor(app) {
        this.app = app;
    }

    processFiles(files) {
        if (files.length !== 2) {
            alert('Please select two images.');
            return;
        }

        const newImages = [];
        const newImageNames = [];
        
        Array.from(files).forEach((file) => {
            if (!file.type.startsWith('image/')) {
                alert('Please select only image files.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    newImageNames.push(file.name);
                    newImages.push(img);
                    
                    if (newImages.length === 2) {
                        this.app.images = [];
                        SIC.cropManager.resetCrop();
                        this.app.images = newImages;
                        this.app.imageNames = newImageNames;

                        // Show canvas and hide dropzone
                        SIC.domElements.canvasContainer.style.display = 'block';
                        SIC.domElements.dropzone.style.display = 'none';
                        this.app.uiManager.updateImageNames();

                        // Calculate and set optimal scale
                        const optimalScale = this.app.renderer.calculateMaxScale(this.app.images[0], this.app.images[1]);
                        this.app.renderer.setScalePercent(this.app.scale / this.app.maxScale, optimalScale);

                        // Draw images
                        this.app.renderer.drawImages();

                        // Enable buttons
                        SIC.domElements.saveButton.disabled = false;
                        SIC.domElements.swapButton.disabled = false;
                        SIC.cropManager.cropButton.disabled = false;
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    saveImage() {
        const format = SIC.domElements.formatSelect.value;
        
        // Check if trying to save as JPG with transparency
        if (this.app.isTransparent && format === 'image/jpeg') {
            alert('JPG format does not support transparency. Please choose PNG format to preserve transparency, or uncheck the Transparent option.');
            return;
        }

        const saveCanvas = document.createElement('canvas');
        this.app.renderer.renderCombinedImage(saveCanvas, 1, {});

        const link = document.createElement('a');
        const fileName = this.createCombinedFilename();
        const extension = format === 'image/jpeg' ? 'jpg' : 'png';
        
        link.download = `${fileName}.${extension}`;

        if (format === 'image/jpeg') {
            const quality = parseInt(SIC.domElements.qualitySlider.value) / 100;
            link.href = saveCanvas.toDataURL(format, quality);
        } else {
            link.href = saveCanvas.toDataURL(format);
        }

        link.click();
    }

    createCombinedFilename() {
        const prefix = SIC.domElements.filenamePrefixInput.value.trim();
        const imageNames = this.app.imageNames;
        
        // Extract base names
        const baseName1 = imageNames[0].includes('.') ? 
            imageNames[0].split('.').slice(0, -1).join('.') : 
            imageNames[0];
        
        const baseName2 = imageNames[1].includes('.') ? 
            imageNames[1].split('.').slice(0, -1).join('.') : 
            imageNames[1];
        
        if (!baseName1) return prefix ? prefix + ' combined_image' : 'combined_image';
        
        // Find common prefix up to the last separator
        const commonPrefix = this.findCommonPrefixLastSeparator(baseName1, baseName2);
        
        if (!commonPrefix) {
            return prefix ? `${prefix} ${baseName1} & ${baseName2}` : `${baseName1} & ${baseName2}`;
        }
        
        // Extract parts after last separator
        const suffix1 = baseName1.substring(commonPrefix.length).trim();
        const suffix2 = baseName2.substring(commonPrefix.length).trim();
        
        const cleanSuffix1 = suffix1.replace(/^[-_\s]+/, '');
        const cleanSuffix2 = suffix2.replace(/^[-_\s]+/, '');
        const cleanPrefix = commonPrefix.replace(/[-_\s]+$/, '');
        
        if (prefix) {
            return cleanSuffix2 ? 
                `${prefix} ${cleanPrefix} - ${cleanSuffix1} & ${cleanSuffix2}` : 
                `${prefix} ${baseName1}`;
        } else {
            return cleanSuffix2 ? 
                `${cleanPrefix} - ${cleanSuffix1} & ${cleanSuffix2}` : 
                baseName1;
        }
    }

    findCommonPrefixLastSeparator(str1, str2) {
        if (str1.charAt(0) !== str2.charAt(0)) return '';
        
        const separators = ['_', '-', ' '];
        const positions1 = [];
        
        separators.forEach(sep => {
            let pos = -1;
            while ((pos = str1.indexOf(sep, pos + 1)) !== -1) {
                positions1.push(pos);
            }
        });
        
        positions1.sort((a, b) => a - b);
        
        let commonLength = 0;
        for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
            if (str1.charAt(i) !== str2.charAt(i)) break;
            commonLength = i + 1;
        }
        
        if (commonLength <= 1) return '';
        
        let lastSepPos = -1;
        for (const pos of positions1) {
            if (pos < commonLength) {
                lastSepPos = pos;
            } else {
                break;
            }
        }
        
        return lastSepPos !== -1 ? str1.substring(0, lastSepPos + 1) : str1.substring(0, commonLength);
    }
}

// ===================================
// STORAGE MANAGER - Handles localStorage operations
// ===================================
class StorageManager {
    static getItem(item, defaultVal) {
        try {
            let value = localStorage.getItem(item);
            if (value === null) {
                return defaultVal;
            } else if (typeof defaultVal === "number") {
                value = parseFloat(value);
                return isFinite(value) ? value : defaultVal;
            } else if (typeof defaultVal === "boolean") {
                return value === "true";
            } else {
                return value;
            }
        } catch(e) {
            return defaultVal;
        }
    }

    static setItem(item, value) {
        try {
            localStorage.setItem(item, value);
            return true;
        } catch(e) {
            return false;
        }
    }
}

// ===================================
// IMAGE RENDERER - Handles all image rendering operations
// ===================================
class ImageRenderer {
    constructor(app) {
        this.app = app;
    }

    calculateMaxScale(img1, img2, overlaid = false, borders = true) {
        let totalWidthAt100;
        let imageHeight = Math.max(img1.height, img2.height);

        if (!overlaid) {
            const gapWidthAt100 = Math.round(this.pixelGap(img1, img2) / SIC.GAP_TO_BORDER_RATIO) * SIC.GAP_TO_BORDER_RATIO;
            const borderSpace = this.app.hasBorders && borders ? gapWidthAt100 / SIC.GAP_TO_BORDER_RATIO : 0;
            totalWidthAt100 = img1.width + img2.width + gapWidthAt100 + borderSpace * 2;
            imageHeight += borderSpace * 2;
        } else {
            totalWidthAt100 = Math.max(img1.width, img2.width);
        }

        const maxHeight = screen.height;
        const viewportWidth = this.app.displayManager.getViewPortWidth();
        const optimalScale = viewportWidth / totalWidthAt100;

        return Math.min(maxHeight / imageHeight, optimalScale);
    }

    setScalePercent(scalePercent, newMaxScale = this.app.maxScale) {
        this.app.scale = Math.min(scalePercent * newMaxScale, newMaxScale);
        this.app.maxScale = newMaxScale;
        const displayScale = Math.round(this.app.scale / this.app.maxScale * 100);
        SIC.domElements.scaleSlider.value = displayScale;
        SIC.domElements.scaleValue.textContent = `${displayScale}%`;
    }

    pixelGap(img1, img2) {
        const avgWidth = (img1.width + img2.width) / 2;
        return avgWidth * (this.app.gapPercent / 100);
    }

    renderCombinedImage(targetCanvas, renderScale, options = {}) {
        if (this.app.images.length !== 2) return null;
        
        const {
            xOffsets = {left: 0, right: 0},
            yOffsets = {left: 0, right: 0},
            avgWidth = -1
        } = options;
        const cropping = avgWidth !== -1;

        const targetCtx = targetCanvas.getContext('2d');
        
        // Calculate gap and border spacing
        let renderGap, borderSpace = 0;
        if (!cropping) {
            renderGap = Math.round(this.pixelGap(this.app.images[0], this.app.images[1]) / SIC.GAP_TO_BORDER_RATIO) * SIC.GAP_TO_BORDER_RATIO * renderScale;
            if (this.app.hasBorders) {
                borderSpace = renderGap / SIC.GAP_TO_BORDER_RATIO;
            }
        } else {
            renderGap = avgWidth * (this.app.gapPercent / 100);
        }

        // Calculate dimensions
        const img1Width = this.app.images[0].width * renderScale;
        const img2Width = this.app.images[1].width * renderScale;
        const rightImgStart = img1Width + renderGap;
        const totalWidth = rightImgStart + img2Width + (borderSpace * 2);

        const img1Height = this.app.images[0].height * renderScale;
        const img2Height = this.app.images[1].height * renderScale;
        const maxImageHeight = Math.max(img1Height + yOffsets.left, img2Height + yOffsets.right);
        const maxHeight = maxImageHeight + (borderSpace * 2);

        // Set canvas dimensions
        targetCanvas.width = totalWidth;
        targetCanvas.height = maxHeight;

        // Handle background fill
        this.handleBackgroundFill(targetCtx, totalWidth, maxHeight, cropping, img1Width, img2Width, img1Height, img2Height, yOffsets, renderGap, borderSpace);

        // Handle rounded corners and draw images
        this.drawImagesWithClipping(targetCtx, this.app.images[0], this.app.images[1], renderScale, cropping, xOffsets, yOffsets, borderSpace, 
            img1Width, img1Height, img2Width, img2Height, rightImgStart);

        // Store render parameters
        const lastRenderParams = {
            img1Width,
            img1Height,
            img2Width,
            img2Height,
            rightImgStart: rightImgStart + borderSpace
        };
        
        return lastRenderParams;
    }

    handleBackgroundFill(ctx, totalWidth, maxHeight, cropping, img1Width, img2Width, img1Height, img2Height, yOffsets, renderGap, borderSpace) {
        if (!cropping) {
            if (this.app.isTransparent) {
                ctx.clearRect(0, 0, totalWidth, maxHeight);
            } else {
                ctx.fillStyle = this.app.gapColor;
                ctx.fillRect(0, 0, totalWidth, maxHeight);
            }
        } else {
            // Crop mode background
            ctx.fillStyle = SIC.BODY_BG_COLOR;
            ctx.fillRect(0, 0, totalWidth, maxHeight);

            // Fill gap area
            const gapStart = Math.max(yOffsets.left, yOffsets.right);
            const gapHeight = Math.min(img1Height + yOffsets.left, img2Height + yOffsets.right) - gapStart;

            if (this.app.isTransparent) {
                ctx.clearRect(
                    img1Width + borderSpace,
                    gapStart + borderSpace,
                    renderGap,
                    gapHeight
                );
            } else {
                ctx.fillStyle = this.app.gapColor;
                ctx.fillRect(
                    img1Width + borderSpace,
                    gapStart + borderSpace,
                    renderGap,
                    gapHeight
                );
            }
        }
    }

    drawImagesWithClipping(ctx, leftImg, rightImg, renderScale, cropping, xOffsets, yOffsets, borderSpace, 
                          img1Width, img1Height, img2Width, img2Height, rightImgStart) {
        ctx.save();
        
        // Handle rounded corners
        if (!cropping && this.app.cornerRadiusPercent > 0) {
            const maxRadius = Math.min(img1Width, img2Width, img1Height, img2Height) / 2;
            const renderCornerRadius = this.app.cornerRadiusPercent / 100 * maxRadius;

            ctx.beginPath();
            
            // Left image clipping region
            ctx.roundRect(
                xOffsets.left + borderSpace, 
                yOffsets.left + borderSpace,
                img1Width - xOffsets.left, 
                img1Height,
                renderCornerRadius
            );
            
            // Right image clipping region
            ctx.roundRect(
                rightImgStart + borderSpace, 
                yOffsets.right + borderSpace,
                img2Width + xOffsets.right, 
                img2Height,
                renderCornerRadius
            );
            
            ctx.clip();
        }

        // Draw left image
        ctx.drawImage(
            leftImg,
            0, 0,
            leftImg.width - xOffsets.left / renderScale, leftImg.height,
            xOffsets.left + borderSpace, yOffsets.left + borderSpace,
            img1Width - xOffsets.left, img1Height
        );

        // Draw right image
        const xFactor = xOffsets.right / renderScale;
        ctx.drawImage(
            rightImg,
            -xFactor, 0,
            rightImg.width + xFactor, rightImg.height,
            rightImgStart + borderSpace, yOffsets.right + borderSpace,
            img2Width + xOffsets.right, img2Height
        );
        
        ctx.restore();
    }

    drawImages(options = {}) {
        return this.renderCombinedImage(SIC.domElements.canvas, this.app.scale, options);
    }
}

// ===================================
// DISPLAY MANAGER - Handles display modes, screen adjustments and rendering context
// ===================================
class DisplayManager {
    constructor(app) {
        this.app = app;
        this.setupFullscreenButton();
        this.setupFullscreenEvents();
        this.setupResizeHandler();
    }

    setupFullscreenButton() {
        const canvasContainer = SIC.domElements.canvasContainer;
        const fullscreenButton = document.createElement('button');
        fullscreenButton.id = 'fullscreenToggle';
        fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
        fullscreenButton.title = 'Toggle fullscreen';
        fullscreenButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background-color: rgba(0, 0, 0, 0.5);
            border-radius: 50%;
            padding: 8px;
            display: none;
            width: 36px;
            height: 36px;
            align-items: center;
            justify-content: center;
        `;

        canvasContainer.style.position = 'relative';
        canvasContainer.appendChild(fullscreenButton);

        // Show button when canvas is displayed
        const observer = new MutationObserver(() => {
            if (canvasContainer.style.display !== 'none') {
                fullscreenButton.style.display = 'flex';
            }
        });
        observer.observe(canvasContainer, { attributes: true });

        fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
        this.fullscreenButton = fullscreenButton;
    }

    setupFullscreenEvents() {
        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        events.forEach(event => {
            document.addEventListener(event, () => this.handleFullscreenChange());
        });

        // Add fullscreen styles
        const style = document.createElement('style');
        style.textContent = `
            #canvasContainer:fullscreen,
            #canvasContainer:-webkit-full-screen,
            #canvasContainer:-moz-full-screen,
            #canvasContainer:-ms-fullscreen {
                background-color: #121212;
                padding: 20px;
                display: flex !important;
                align-items: center;
                justify-content: center;
                overflow: auto;
            }
            #canvasContainer:fullscreen #canvas,
            #canvasContainer:-webkit-full-screen #canvas,
            #canvasContainer:-moz-full-screen #canvas,
            #canvasContainer:-ms-fullscreen #canvas {
                object-fit: contain;
            }
        `;
        document.head.appendChild(style);
    }

    setupResizeHandler() {
        // Listen for window resize events
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        if (this.app.images.length === 2) {
            if (SIC.cropManager.isCropping) {
                SIC.cropManager.onScaleChange(0);
            } else {
                const optimalScale = this.app.renderer.calculateMaxScale(
                    this.app.images[0], 
                    this.app.images[1]
                );
                this.app.renderer.setScalePercent(
                    this.app.scale / this.app.maxScale, 
                    optimalScale
                );
                this.app.renderer.drawImages();
            }
        }
    }

    isFullscreen() {
        return document.fullscreenElement || 
            document.webkitFullscreenElement || 
            document.mozFullScreenElement || 
            document.msFullscreenElement;
    }

    handleFullscreenChange() {
        if (this.isFullscreen()) {
            this.fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7"></path></svg>';
        } else {
            this.fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
        }
        
        // Allow time for fullscreen transition to complete, then resize
        setTimeout(() => this.handleResize(), 250);
    }

    toggleFullscreen() {
        const element = SIC.domElements.canvasContainer;
        
        if (!this.isFullscreen()) {
            // Enter fullscreen
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    getViewPortWidth() {
        const mainContainer = document.getElementById('main-container');
        const isVerticalLayout = window.getComputedStyle(mainContainer).flexDirection === 'column';
        const leftPanelWidth = document.fullscreenElement ? 0 : document.getElementById('left-panel').offsetWidth;
        return isVerticalLayout ? window.innerWidth - 15 : window.innerWidth - leftPanelWidth - 50;
    }
}

// ===================================
// HELP MANAGER - Handles help functionality
// ===================================
class HelpManager {
    static initialize() {
        const headerContainer = document.querySelector('.header-container');
        const helpIconContainer = document.createElement('div');
        helpIconContainer.className = 'help-icon';
        helpIconContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #333333;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            transition: background-color 0.2s;
            position: absolute;
            right: 60px;
            cursor: pointer;
        `;

        helpIconContainer.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9.09 9.00001C9.3251 8.33167 9.78915 7.76811 10.4 7.40914C11.0108 7.05016 11.7289 6.91894 12.4272 7.03873C13.1255 7.15852 13.7588 7.52154 14.2151 8.06354C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 17H12.01" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        helpIconContainer.addEventListener('mouseover', () => {
            helpIconContainer.style.backgroundColor = '#444444';
        });

        helpIconContainer.addEventListener('mouseout', () => {
            helpIconContainer.style.backgroundColor = '#333333';
        });

        helpIconContainer.addEventListener('click', HelpManager.openHelp);
        headerContainer.appendChild(helpIconContainer);
    }

    static openHelp() {
        window.open('help.html', '_blank');
    }
}

// ===================================
// APPLICATION INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    HelpManager.initialize();
    // Create global app instance
    window.app = new SIC();
});
