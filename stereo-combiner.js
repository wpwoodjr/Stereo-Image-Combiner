// ===================================
// CORE StereoImageCombiner MODULE - Main application state and initialization
// ===================================
class SIC {
    // constants
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

    // state variables
    static images = [];
    static imageNames = [];

    static gapPercent = SIC.DEFAULT_GAP_PERCENT;
    static hasBorders = SIC.DEFAULT_BORDERS;
    static gapColor = SIC.DEFAULT_COLOR;
    static isTransparent = SIC.DEFAULT_TRANSPARENT;
    static cornerRadiusPercent = SIC.DEFAULT_CORNER_RADIUS;

    static initialize() {
        HelpManager.initialize();
        UIManager.initialize();
        DisplayManager.initialize();
    }
}

// ===================================
// UI MANAGER - Handles UI and event listeners
// ===================================
class UIManager {
    static domElements = null;

    static initialize() {
        this.domElements = this.initDOMElements();
        this.setupDropzoneEvents();
        this.setupControlEvents();
        this.setupCanvasEvents();
        this.setupKeyboardEvents();
        this.setupDropzoneMessage();
        this.setupButtons();
        this.resetControlsToDefaults();
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

    static setupButtons() {
        // Disable buttons initially
        this.domElements.saveButton.disabled = true;
        this.domElements.swapButton.disabled = true;
    }

    static setupDropzoneEvents() {
        const { dropzone, dropzoneMessage, fileInput } = this.domElements;
        
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
            dropzoneMessage.innerHTML = this.getDropzoneMessageText();
        });

        dropzone.addEventListener('drop', (e) => {
            dropzoneMessage.innerHTML = this.getDropzoneMessageText();
            e.preventDefault();
            dropzone.style.backgroundColor = '#202020';
            FileManager.processFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                FileManager.processFiles(e.target.files);
                fileInput.value = '';
            }
        });
    }

    static setupControlEvents() {
        const elements = this.domElements;
        
        elements.scaleSlider.addEventListener('input', () => this.updateScale());
        elements.gapSlider.addEventListener('input', () => this.updateGap());
        elements.colorPicker.addEventListener('input', () => this.updateColor());
        elements.bordersCheckbox.addEventListener('input', () => this.updateBorders());
        elements.transparentCheckbox.addEventListener('input', () => this.updateTransparent());
        elements.cornerRadiusSlider.addEventListener('input', () => this.updateCornerRadius());
        elements.swapButton.addEventListener('click', () => this.updateSwap());
        elements.saveButton.addEventListener('click', () => FileManager.saveImage());
        
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

    static setupCanvasEvents() {
        const { canvasContainer, canvas, fileInput } = this.domElements;

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
            FileManager.processFiles(e.dataTransfer.files);
        });

        canvasContainer.addEventListener('click', (e) => {
            if (CropManager.isCropping) return;
            if (e.target === canvas || e.target === canvasContainer) {
                fileInput.click();
            }
        });
    }

    static setupKeyboardEvents() {
        window.addEventListener('keydown', (e) => {
            // Check if input element is focused
            if (document.activeElement.tagName === 'INPUT' || 
                document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case 'x':
                    this.updateSwap();
                    e.preventDefault();
                    break;
                case 'f':
                    DisplayManager.toggleFullscreen();
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
    static getDropzoneMessageText() {
        let text = "Drag and drop two images here or click to browse";
        if (window.matchMedia('(pointer: fine)').matches) {
            text += "<br><small>(Hold Ctrl or ⌘ while clicking to select both images)</small>";
        }
        return text;
    }

    static setupDropzoneMessage() {
        this.domElements.dropzoneMessage.innerHTML = this.getDropzoneMessageText();
    }

    static resetControlsToDefaults() {
        const elements = this.domElements;

        // Reset scale
        const uncroppedScalePercent = StorageManager.getItem('uncroppedScalePercent', SIC.DEFAULT_SCALE);
        ImageRenderer.setScalePercent(uncroppedScalePercent, 1);

        // Reset gap and borders
        SIC.gapPercent = StorageManager.getItem('gapPercent', SIC.DEFAULT_GAP_PERCENT);
        elements.gapSlider.value = SIC.gapPercent * 10;
        elements.gapValue.textContent = `${SIC.gapPercent.toFixed(1)}%`;
        SIC.hasBorders = StorageManager.getItem('hasBorders', SIC.DEFAULT_BORDERS);
        elements.bordersCheckbox.checked = SIC.hasBorders;

        // Reset color and transparency
        SIC.gapColor = StorageManager.getItem('gapColor', SIC.DEFAULT_COLOR);
        elements.colorPicker.value = SIC.gapColor;
        SIC.isTransparent = StorageManager.getItem('isTransparent', SIC.DEFAULT_TRANSPARENT);
        elements.transparentCheckbox.checked = SIC.isTransparent;
        this.updateColorPickerState();

        // Reset corner radius
        SIC.cornerRadiusPercent = StorageManager.getItem('cornerRadiusPercent', SIC.DEFAULT_CORNER_RADIUS);
        elements.cornerRadiusSlider.value = SIC.cornerRadiusPercent;
        elements.cornerRadiusValue.textContent = `${SIC.cornerRadiusPercent}%`;

        // Reset format and quality
        elements.filenamePrefixInput.value = StorageManager.getItem('filenamePrefix', '');
        elements.qualitySlider.value = StorageManager.getItem('jpgQuality', SIC.DEFAULT_JPG_QUALITY);
        elements.qualityValue.textContent = `${elements.qualitySlider.value}%`;
        elements.formatSelect.value = StorageManager.getItem('fileFormat', SIC.DEFAULT_FORMAT);
        elements.qualityContainer.style.display = elements.formatSelect.value === 'image/jpeg' ? 'block' : 'none';
    }

    static updateScale() {
        const newScalePercent = parseInt(this.domElements.scaleSlider.value) / 100;

        if (CropManager.isCropping) {
            CropManager.onScaleChange(newScalePercent);
        } else {
            ImageRenderer.setScalePercent(newScalePercent);
            if (CropManager.isCropped) {
                StorageManager.setItem('croppedScalePercent', newScalePercent);
            } else {
                StorageManager.setItem('uncroppedScalePercent', newScalePercent);
            }
            ImageRenderer.drawImages();
        }
    }

    static updateGap() {
        const sliderValue = parseInt(this.domElements.gapSlider.value);
        SIC.gapPercent = sliderValue / 10;
        StorageManager.setItem('gapPercent', SIC.gapPercent);
        this.domElements.gapValue.textContent = `${SIC.gapPercent.toFixed(1)}%`;

        if (SIC.images.length !== 2) return;

        if (CropManager.isCropping) {
            CropManager.onScaleChange(0);
        } else {
            const optimalScale = ImageRenderer.calculateMaxScale(SIC.images[0], SIC.images[1]);
            ImageRenderer.setScalePercent(ImageRenderer.currentScalePercent(), optimalScale);
            ImageRenderer.drawImages();
        }
    }

    static updateColor() {
        SIC.gapColor = this.domElements.colorPicker.value;
        StorageManager.setItem('gapColor', SIC.gapColor);
        if (CropManager.isCropping) {
            CropManager.drawCropInterface();
        } else {
            ImageRenderer.drawImages();
        }
    }

    static updateBorders() {
        SIC.hasBorders = this.domElements.bordersCheckbox.checked;
        StorageManager.setItem('hasBorders', SIC.hasBorders);

        if (SIC.images.length !== 2) return;

        if (CropManager.isCropping) {
            CropManager.onScaleChange(0);
        } else {
            const optimalScale = ImageRenderer.calculateMaxScale(SIC.images[0], SIC.images[1]);
            ImageRenderer.setScalePercent(ImageRenderer.currentScalePercent(), optimalScale);
            ImageRenderer.drawImages();
        }
    }

    static updateTransparent() {
        SIC.isTransparent = this.domElements.transparentCheckbox.checked;
        StorageManager.setItem('isTransparent', SIC.isTransparent);
        this.updateColorPickerState();
        if (CropManager.isCropping) {
            CropManager.drawCropInterface();
        } else {
            ImageRenderer.drawImages();
        }
    }

    static updateColorPickerState() {
        const colorPicker = this.domElements.colorPicker;
        const canvas = this.domElements.canvas;
        
        colorPicker.disabled = SIC.isTransparent;
        if (SIC.isTransparent) {
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

    static updateCornerRadius() {
        SIC.cornerRadiusPercent = parseInt(this.domElements.cornerRadiusSlider.value);
        StorageManager.setItem('cornerRadiusPercent', SIC.cornerRadiusPercent);
        this.domElements.cornerRadiusValue.textContent = `${SIC.cornerRadiusPercent}%`;
        if (CropManager.isCropping) {
            CropManager.drawCropInterface();
        } else {
            ImageRenderer.drawImages();
        }
    }

    static updateSwap() {
        [SIC.images[0], SIC.images[1]] = [SIC.images[1], SIC.images[0]];
        [SIC.imageNames[0], SIC.imageNames[1]] = [SIC.imageNames[1], SIC.imageNames[0]];
        this.updateImageNames();
        CropManager.onSwap();
    }

    static updateImageNames() {
        this.domElements.leftImageName.textContent = SIC.imageNames[0] || '';
        this.domElements.rightImageName.textContent = SIC.imageNames[1] || '';
    }
}

// ===================================
// FILE MANAGER - Handles file operations
// ===================================
class FileManager {
    static processFiles(files) {
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
                        SIC.images = [];
                        CropManager.resetCrop();
                        SIC.images = newImages;
                        SIC.imageNames = newImageNames;

                        // Show canvas and hide dropzone
                        UIManager.domElements.canvasContainer.style.display = 'block';
                        UIManager.domElements.dropzone.style.display = 'none';
                        UIManager.updateImageNames();

                        // Calculate and set optimal scale
                        const optimalScale = ImageRenderer.calculateMaxScale(SIC.images[0], SIC.images[1]);
                        ImageRenderer.setScalePercent(ImageRenderer.currentScalePercent(), optimalScale);

                        // Draw images
                        ImageRenderer.drawImages();

                        // Enable buttons
                        UIManager.domElements.saveButton.disabled = false;
                        UIManager.domElements.swapButton.disabled = false;
                        CropManager.cropButton.disabled = false;
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    static saveImage() {
        const format = UIManager.domElements.formatSelect.value;
        
        // Check if trying to save as JPG with transparency
        if (SIC.isTransparent && format === 'image/jpeg') {
            alert('JPG format does not support transparency. Please choose PNG format to preserve transparency, or uncheck the Transparent option.');
            return;
        }

        const saveCanvas = document.createElement('canvas');
        ImageRenderer.renderCombinedImage(saveCanvas, 1, {});

        const link = document.createElement('a');
        const fileName = this.createCombinedFilename();
        const extension = format === 'image/jpeg' ? 'jpg' : 'png';
        
        link.download = `${fileName}.${extension}`;

        if (format === 'image/jpeg') {
            const quality = parseInt(UIManager.domElements.qualitySlider.value) / 100;
            link.href = saveCanvas.toDataURL(format, quality);
        } else {
            link.href = saveCanvas.toDataURL(format);
        }

        link.click();
    }

    static createCombinedFilename() {
        const prefix = UIManager.domElements.filenamePrefixInput.value.trim();
        const imageNames = SIC.imageNames;
        
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

    static findCommonPrefixLastSeparator(str1, str2) {
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
    static scale = 1;
    static maxScale = 1;

    static currentScalePercent() {
        return this.scale / this.maxScale;
    }

    static calculateMaxScale(img1, img2, overlaid = false, borders = true) {
        let totalWidthAt100;
        let imageHeight = Math.max(img1.height, img2.height);

        if (!overlaid) {
            const gapWidthAt100 = Math.round(this.pixelGap(img1, img2) / SIC.GAP_TO_BORDER_RATIO) * SIC.GAP_TO_BORDER_RATIO;
            const borderSpace = SIC.hasBorders && borders ? gapWidthAt100 / SIC.GAP_TO_BORDER_RATIO : 0;
            totalWidthAt100 = img1.width + img2.width + gapWidthAt100 + borderSpace * 2;
            imageHeight += borderSpace * 2;
        } else {
            totalWidthAt100 = Math.max(img1.width, img2.width);
        }

        const maxHeight = screen.height;
        const viewportWidth = DisplayManager.getViewPortWidth();
        const optimalScale = viewportWidth / totalWidthAt100;

        return Math.min(maxHeight / imageHeight, optimalScale);
    }

    static setScalePercent(scalePercent, newMaxScale = this.maxScale) {
        this.scale = Math.min(scalePercent * newMaxScale, newMaxScale);
        this.maxScale = newMaxScale;
        const displayScale = Math.round(this.scale / this.maxScale * 100);
        UIManager.domElements.scaleSlider.value = displayScale;
        UIManager.domElements.scaleValue.textContent = `${displayScale}%`;
    }

    static pixelGap(img1, img2) {
        const avgWidth = (img1.width + img2.width) / 2;
        return avgWidth * (SIC.gapPercent / 100);
    }

    static renderCombinedImage(targetCanvas, renderScale, options = {}) {
        if (SIC.images.length !== 2) return null;
        
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
            renderGap = Math.round(this.pixelGap(SIC.images[0], SIC.images[1]) / SIC.GAP_TO_BORDER_RATIO) * SIC.GAP_TO_BORDER_RATIO * renderScale;
            if (SIC.hasBorders) {
                borderSpace = renderGap / SIC.GAP_TO_BORDER_RATIO;
            }
        } else {
            renderGap = avgWidth * (SIC.gapPercent / 100);
        }

        // Calculate dimensions
        const img1Width = SIC.images[0].width * renderScale;
        const img2Width = SIC.images[1].width * renderScale;
        const rightImgStart = img1Width + renderGap;
        const totalWidth = rightImgStart + img2Width + (borderSpace * 2);

        const img1Height = SIC.images[0].height * renderScale;
        const img2Height = SIC.images[1].height * renderScale;
        const maxImageHeight = Math.max(img1Height + yOffsets.left, img2Height + yOffsets.right);
        const maxHeight = maxImageHeight + (borderSpace * 2);

        // Set canvas dimensions
        targetCanvas.width = totalWidth;
        targetCanvas.height = maxHeight;

        // Handle background fill
        this.handleBackgroundFill(targetCtx, totalWidth, maxHeight, cropping, img1Width, img2Width, img1Height, img2Height, yOffsets, renderGap, borderSpace);

        // Handle rounded corners and draw images
        this.drawImagesWithClipping(targetCtx, SIC.images[0], SIC.images[1], renderScale, cropping, xOffsets, yOffsets, borderSpace, 
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

    static handleBackgroundFill(ctx, totalWidth, maxHeight, cropping, img1Width, img2Width, img1Height, img2Height, yOffsets, renderGap, borderSpace) {
        if (!cropping) {
            if (SIC.isTransparent) {
                ctx.clearRect(0, 0, totalWidth, maxHeight);
            } else {
                ctx.fillStyle = SIC.gapColor;
                ctx.fillRect(0, 0, totalWidth, maxHeight);
            }
        } else {
            // Crop mode background
            ctx.fillStyle = SIC.BODY_BG_COLOR;
            ctx.fillRect(0, 0, totalWidth, maxHeight);

            // Fill gap area
            const gapStart = Math.max(yOffsets.left, yOffsets.right);
            const gapHeight = Math.min(img1Height + yOffsets.left, img2Height + yOffsets.right) - gapStart;

            if (SIC.isTransparent) {
                ctx.clearRect(
                    img1Width + borderSpace,
                    gapStart + borderSpace,
                    renderGap,
                    gapHeight
                );
            } else {
                ctx.fillStyle = SIC.gapColor;
                ctx.fillRect(
                    img1Width + borderSpace,
                    gapStart + borderSpace,
                    renderGap,
                    gapHeight
                );
            }
        }
    }

    static drawImagesWithClipping(ctx, leftImg, rightImg, renderScale, cropping, xOffsets, yOffsets, borderSpace, 
                          img1Width, img1Height, img2Width, img2Height, rightImgStart) {
        ctx.save();
        
        // Handle rounded corners
        if (!cropping && SIC.cornerRadiusPercent > 0) {
            const maxRadius = Math.min(img1Width, img2Width, img1Height, img2Height) / 2;
            const renderCornerRadius = SIC.cornerRadiusPercent / 100 * maxRadius;

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

    static drawImages(options = {}) {
        return this.renderCombinedImage(UIManager.domElements.canvas, this.scale, options);
    }
}

// ===================================
// DISPLAY MANAGER - Handles display modes, screen adjustments and rendering context
// ===================================
class DisplayManager {
    static initialize() {
        this.setupFullscreenButton();
        this.setupFullscreenEvents();
        this.setupResizeHandler();
    }

    static setupFullscreenButton() {
        const canvasContainer = UIManager.domElements.canvasContainer;
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

    static setupFullscreenEvents() {
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

    static setupResizeHandler() {
        // Listen for window resize events
        window.addEventListener('resize', () => this.handleResize());
    }

    static handleResize() {
        if (SIC.images.length === 2) {
            if (CropManager.isCropping) {
                CropManager.onScaleChange(0);
            } else {
                const optimalScale = ImageRenderer.calculateMaxScale(
                    SIC.images[0], 
                    SIC.images[1]
                );
                ImageRenderer.setScalePercent(
                    ImageRenderer.currentScalePercent(), 
                    optimalScale
                );
                ImageRenderer.drawImages();
            }
        }
    }

    static isFullscreen() {
        return document.fullscreenElement || 
            document.webkitFullscreenElement || 
            document.mozFullScreenElement || 
            document.msFullscreenElement;
    }

    static handleFullscreenChange() {
        if (this.isFullscreen()) {
            this.fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7"></path></svg>';
        } else {
            this.fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
        }
        
        // Allow time for fullscreen transition to complete, then resize
        setTimeout(() => this.handleResize(), 250);
    }

    static toggleFullscreen() {
        const element = UIManager.domElements.canvasContainer;
        
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

    static getViewPortWidth() {
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

        helpIconContainer.addEventListener('click', this.openHelp);
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
    SIC.initialize();
});
