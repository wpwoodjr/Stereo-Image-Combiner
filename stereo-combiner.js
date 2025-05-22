// ===================================
// CORE StereoImageCombiner MODULE - Main application state and initialization
// ===================================
class SIC {
    // state variables
    static images = [];
    static imageNames = [];

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
    static DEFAULT_COLOR = '#000000';
    static GAP_TO_BORDER_RATIO = 1;
    static DEFAULT_GAP_PERCENT = 3.0;
    static DEFAULT_BORDERS = true;
    static DEFAULT_TRANSPARENT = false;
    static DEFAULT_CORNER_RADIUS = 0;

    static domElements = null;
    static gapColor = this.DEFAULT_COLOR;
    static gapPercent = this.DEFAULT_GAP_PERCENT;
    static hasBorders = this.DEFAULT_BORDERS;
    static isTransparent = this.DEFAULT_TRANSPARENT;
    static cornerRadiusPercent = this.DEFAULT_CORNER_RADIUS;

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
        const uncroppedScalePercent = StorageManager.getItem('uncroppedScalePercent', ImageRenderer.DEFAULT_SCALE_PERCENT);
        ImageRenderer.setScalePercent(uncroppedScalePercent, 1);

        // Reset gap and borders
        this.gapPercent = StorageManager.getItem('gapPercent', this.DEFAULT_GAP_PERCENT);
        elements.gapSlider.value = this.gapPercent * 10;
        elements.gapValue.textContent = `${this.gapPercent.toFixed(1)}%`;
        this.hasBorders = StorageManager.getItem('hasBorders', this.DEFAULT_BORDERS);
        elements.bordersCheckbox.checked = this.hasBorders;

        // Reset color and transparency
        this.gapColor = StorageManager.getItem('gapColor', UIManager.DEFAULT_COLOR);
        elements.colorPicker.value = this.gapColor;
        this.isTransparent = StorageManager.getItem('isTransparent', this.DEFAULT_TRANSPARENT);
        elements.transparentCheckbox.checked = this.isTransparent;
        this.updateColorPickerState();

        // Reset corner radius
        this.cornerRadiusPercent = StorageManager.getItem('cornerRadiusPercent', this.DEFAULT_CORNER_RADIUS);
        elements.cornerRadiusSlider.value = this.cornerRadiusPercent;
        elements.cornerRadiusValue.textContent = `${this.cornerRadiusPercent}%`;

        // Reset format and quality
        elements.filenamePrefixInput.value = StorageManager.getItem('filenamePrefix', '');
        elements.qualitySlider.value = StorageManager.getItem('jpgQuality', FileManager.DEFAULT_JPG_QUALITY);
        elements.qualityValue.textContent = `${elements.qualitySlider.value}%`;
        elements.formatSelect.value = StorageManager.getItem('fileFormat', FileManager.DEFAULT_FORMAT);
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
        this.gapPercent = sliderValue / 10;
        StorageManager.setItem('gapPercent', this.gapPercent);
        this.domElements.gapValue.textContent = `${this.gapPercent.toFixed(1)}%`;

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
        this.gapColor = this.domElements.colorPicker.value;
        StorageManager.setItem('gapColor', this.gapColor);
        if (CropManager.isCropping) {
            CropRenderer.drawCropInterface();
        } else {
            ImageRenderer.drawImages();
        }
    }

    static updateBorders() {
        this.hasBorders = this.domElements.bordersCheckbox.checked;
        StorageManager.setItem('hasBorders', this.hasBorders);

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
        this.isTransparent = this.domElements.transparentCheckbox.checked;
        StorageManager.setItem('isTransparent', this.isTransparent);
        this.updateColorPickerState();
        if (CropManager.isCropping) {
            CropRenderer.drawCropInterface();
        } else {
            ImageRenderer.drawImages();
        }
    }

    static updateColorPickerState() {
        const colorPicker = this.domElements.colorPicker;
        const canvas = this.domElements.canvas;
        
        colorPicker.disabled = this.isTransparent;
        if (this.isTransparent) {
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
        this.cornerRadiusPercent = parseInt(this.domElements.cornerRadiusSlider.value);
        StorageManager.setItem('cornerRadiusPercent', this.cornerRadiusPercent);
        this.domElements.cornerRadiusValue.textContent = `${this.cornerRadiusPercent}%`;
        if (CropManager.isCropping) {
            CropRenderer.drawCropInterface();
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

    static setSaveButtonDisabledState(state) {
        this.domElements.saveButton.disabled = state;
    }
}

// ===================================
// FILE MANAGER - Handles file operations
// ===================================
class FileManager {
    static DEFAULT_FORMAT = 'image/jpeg';
    static DEFAULT_JPG_QUALITY = 90;
    static MIN_IMAGE_DIMENSION = 10;
    static CONSISTENCY_THRESHOLD = 0.99; // Target for augmented dominant color percentage

    // Thresholds for _isColorDifferenceSignificant
    static COLOR_DIFF_THRESHOLD_DELTA_E = 10.0; // Perceptual difference for RGB (Delta E 76)
    static ALPHA_DIFF_THRESHOLD = 10;          // Absolute difference for alpha channel

    /**
     * Helper to get RGBA color of a pixel from imageData.data.
     */
    static _getPixelColor(data, x, y, imgWidth, imgHeight) {
        if (x < 0 || x >= imgWidth || y < 0 || y >= imgHeight) return null;
        const i = (y * imgWidth + x) * 4;
        return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
    }

    /**
     * Converts RGB to XYZ. Assumes R,G,B are 0-255.
     */
    static _rgbToXyz(r, g, b) {
        let R_norm = r / 255;
        let G_norm = g / 255;
        let B_norm = b / 255;
        R_norm = (R_norm > 0.04045) ? Math.pow((R_norm + 0.055) / 1.055, 2.4) : R_norm / 12.92;
        G_norm = (G_norm > 0.04045) ? Math.pow((G_norm + 0.055) / 1.055, 2.4) : G_norm / 12.92;
        B_norm = (B_norm > 0.04045) ? Math.pow((B_norm + 0.055) / 1.055, 2.4) : B_norm / 12.92;
        const X = R_norm * 0.4124564 + G_norm * 0.3575761 + B_norm * 0.1804375;
        const Y = R_norm * 0.2126729 + G_norm * 0.7151522 + B_norm * 0.0721750;
        const Z = R_norm * 0.0193339 + G_norm * 0.1191920 + B_norm * 0.9503041;
        return { x: X * 100, y: Y * 100, z: Z * 100 };
    }

    /**
     * Converts XYZ to CIE L*a*b*. Uses D65 reference white.
     */
    static _xyzToLab(x, y, z) {
        const refX = 95.047, refY = 100.000, refZ = 108.883;
        let xr = x / refX, yr = y / refY, zr = z / refZ;
        const epsilon = 0.008856, kappa = 903.3;
        xr = (xr > epsilon) ? Math.cbrt(xr) : (kappa * xr + 16) / 116;
        yr = (yr > epsilon) ? Math.cbrt(yr) : (kappa * yr + 16) / 116;
        zr = (zr > epsilon) ? Math.cbrt(zr) : (kappa * zr + 16) / 116;
        return { l: (116 * yr) - 16, a: 500 * (xr - yr), b: 200 * (yr - zr) };
    }

    /**
     * Calculates CIE76 Delta E between two L*a*b* colors.
     */
    static _deltaE76(lab1, lab2) {
        const dL = lab1.l - lab2.l, dA = lab1.a - lab2.a, dB = lab1.b - lab2.b;
        return Math.sqrt(dL * dL + dA * dA + dB * dB);
    }
    
    /**
     * Checks if the perceptual color difference (Delta E for RGB, absolute for Alpha)
     * between two RGBA colors is above specified thresholds.
     * Returns true if colors are significantly DIFFERENT, false if they are similar.
     */
    static _isColorDifferenceSignificant(rgba1, rgba2) {
        if (!rgba1 || !rgba2) return true; 
        if (Math.abs(rgba1.a - rgba2.a) > this.ALPHA_DIFF_THRESHOLD) return true;
        
        const xyz1 = this._rgbToXyz(rgba1.r, rgba1.g, rgba1.b);
        const lab1 = this._xyzToLab(xyz1.x, xyz1.y, xyz1.z);
        const xyz2 = this._rgbToXyz(rgba2.r, rgba2.g, rgba2.b);
        const lab2 = this._xyzToLab(xyz2.x, xyz2.y, xyz2.z);
        const deltaE = this._deltaE76(lab1, lab2);
        return deltaE > this.COLOR_DIFF_THRESHOLD_DELTA_E;
    }

    /**
     * Hybrid consistency check for a column segment.
     * Finds dominant color, then augments its count with perceptually similar colors.
     * @returns {{dominantColor: {r,g,b,a}|null, percent: number, totalPixels: number}}
     * 'percent' is the augmented consistency percentage.
     */
    static _getColumnConsistency(imageData, colX, yStart, yEnd, imgWidth, imgHeight) {
        if (yStart > yEnd || colX < 0 || colX >= imgWidth) {
            return { dominantColor: null, percent: 0, totalPixels: 0 };
        }

        const counts = new Map(); 
        const uniqueColors = new Map(); 
        let totalValidPixels = 0;

        for (let y = yStart; y <= yEnd; y++) {
            const p = this._getPixelColor(imageData.data, colX, y, imgWidth, imgHeight);
            if (p) {
                const pStr = `${p.r},${p.g},${p.b},${p.a}`;
                counts.set(pStr, (counts.get(pStr) || 0) + 1);
                if (!uniqueColors.has(pStr)) uniqueColors.set(pStr, p);
                totalValidPixels++;
            }
        }

        if (totalValidPixels === 0) return { dominantColor: null, percent: 1.0, totalPixels: 0 };

        let initialDominantColorStr = null;
        let initialMaxCount = 0;
        for (const [pStr, count] of counts) {
            if (count > initialMaxCount) {
                initialMaxCount = count;
                initialDominantColorStr = pStr;
            }
        }

        if (!initialDominantColorStr) return { dominantColor: null, percent: 0, totalPixels };
        
        const initialDominantColor = uniqueColors.get(initialDominantColorStr);
        let augmentedDominantCount = initialMaxCount;

        for (const [pStr, count] of counts) {
            if (pStr === initialDominantColorStr) continue;
            const otherColor = uniqueColors.get(pStr);
            if (!this._isColorDifferenceSignificant(initialDominantColor, otherColor)) {
                augmentedDominantCount += count; // Add count of similar colors
            }
        }
        
        const finalConsistencyPercent = totalValidPixels > 0 ? augmentedDominantCount / totalValidPixels : 1.0;
        if (finalConsistencyPercent < this.CONSISTENCY_THRESHOLD) {
            console.log(colX, initialDominantColor);
            console.log(`${finalConsistencyPercent}%`, initialMaxCount, augmentedDominantCount);
        }
        return { 
            dominantColor: initialDominantColor,
            percent: finalConsistencyPercent,
            totalPixels: totalValidPixels
        };
    }

    /**
     * Hybrid consistency check for a row segment.
     */
    static _getRowConsistency(imageData, rowY, xStart, xEnd, imgWidth, imgHeight) {
        if (xStart > xEnd || rowY < 0 || rowY >= imgHeight) {
            return { dominantColor: null, percent: 0, totalPixels: 0 };
        }
        
        const counts = new Map();
        const uniqueColors = new Map();
        let totalValidPixels = 0;

        for (let x = xStart; x <= xEnd; x++) {
            const p = this._getPixelColor(imageData.data, x, rowY, imgWidth, imgHeight);
            if (p) {
                const pStr = `${p.r},${p.g},${p.b},${p.a}`;
                counts.set(pStr, (counts.get(pStr) || 0) + 1);
                if (!uniqueColors.has(pStr)) uniqueColors.set(pStr, p);
                totalValidPixels++;
            }
        }

        if (totalValidPixels === 0) return { dominantColor: null, percent: 1.0, totalPixels: 0 };

        let initialDominantColorStr = null;
        let initialMaxCount = 0;
        for (const [pStr, count] of counts) {
            if (count > initialMaxCount) {
                initialMaxCount = count;
                initialDominantColorStr = pStr;
            }
        }
         if (!initialDominantColorStr) return { dominantColor: null, percent: 0, totalPixels };

        const initialDominantColor = uniqueColors.get(initialDominantColorStr);
        let augmentedDominantCount = initialMaxCount;

        for (const [pStr, count] of counts) {
            if (pStr === initialDominantColorStr) continue;
            const otherColor = uniqueColors.get(pStr);
            if (!this._isColorDifferenceSignificant(initialDominantColor, otherColor)) {
                augmentedDominantCount += count;
            }
        }

        const finalConsistencyPercent = totalValidPixels > 0 ? augmentedDominantCount / totalValidPixels : 1.0;
        return { 
            dominantColor: initialDominantColor,
            percent: finalConsistencyPercent,
            totalPixels: totalValidPixels
        };
    }
    
    static _splitAreaInHalfVertically(x, y, width, height) {
        if (width < this.MIN_IMAGE_DIMENSION * 2 || height < this.MIN_IMAGE_DIMENSION) {
             console.warn(`Area ${width}x${height} at (${x},${y}) is too small to split meaningfully.`);
             return null; 
        }
        const w1 = Math.floor(width / 2);
        const w2 = width - w1; 
        console.log(`Splitting area (x:${x} y:${y} w:${width} h:${height}) in half -> w1:${w1}, w2:${w2}`);
        return {
            region1: { x: x, y: y, width: w1, height: height },
            region2: { x: x + w1, y: y, width: w2, height: height }
        };
    }

    static _analyzeAndExtractSubImageRegions_MultiStage(imageData, imgWidth, imgHeight) {
        // --- Stage 1: Determine Outer Horizontal Crop Points ---
        let outerX1 = imgWidth; 
        for (let x = 0; x < imgWidth; x++) {
            if (this._getColumnConsistency(imageData, x, 0, imgHeight - 1, imgWidth, imgHeight).percent < this.CONSISTENCY_THRESHOLD) {
                outerX1 = x;
                break;
            }
        }

        let outerX2 = -1; 
        for (let x = imgWidth - 1; x >= outerX1; x--) { 
            if (this._getColumnConsistency(imageData, x, 0, imgHeight - 1, imgWidth, imgHeight).percent < this.CONSISTENCY_THRESHOLD) {
                outerX2 = x;
                break;
            }
        }

        if (outerX1 >= imgWidth || outerX2 < 0 || outerX2 < outerX1) { 
            console.warn("MultiStage - Stage 1: Entire image width has consistent columns or no valid content block. Splitting original.");
            return this._splitAreaInHalfVertically(0, 0, imgWidth, imgHeight);
        }

        const stage1ContentWidth = outerX2 - outerX1 + 1;
        if (stage1ContentWidth < this.MIN_IMAGE_DIMENSION * 2) {
            console.warn(`MultiStage - Stage 1: Outer content width ${stage1ContentWidth} is too small. Splitting original.`);
            return this._splitAreaInHalfVertically(0, 0, imgWidth, imgHeight);
        }
        console.log(`MultiStage - Stage 1: Outer X-bounds: ${outerX1} to ${outerX2} (Width: ${stage1ContentWidth})`);

        // --- Stage 2: Split the Stage 1 cropped area and Refine Inner Horizontal Edges ---
        const nominalSplitPointAbsolute = outerX1 + Math.floor(stage1ContentWidth / 2);
        
        let finalLeftImageRightX = outerX1 - 1; 
        for (let currentX = nominalSplitPointAbsolute - 1; currentX >= outerX1; currentX--) {
            if (this._getColumnConsistency(imageData, currentX, 0, imgHeight - 1, imgWidth, imgHeight).percent < this.CONSISTENCY_THRESHOLD) {
                finalLeftImageRightX = currentX; 
                break;
            }
        }

        let finalRightImageLeftX = outerX2 + 1; 
        for (let currentX = nominalSplitPointAbsolute; currentX <= outerX2; currentX++) {
            if (this._getColumnConsistency(imageData, currentX, 0, imgHeight - 1, imgWidth, imgHeight).percent < this.CONSISTENCY_THRESHOLD) {
                finalRightImageLeftX = currentX; 
                break;
            }
        }
        console.log(`MultiStage - Stage 2: Left image potential right edge X: ${finalLeftImageRightX}, Right image potential left edge X: ${finalRightImageLeftX}`);

        const img1ProposedWidth = finalLeftImageRightX - outerX1 + 1;
        const img2ProposedWidth = outerX2 - finalRightImageLeftX + 1;
        
        if (finalRightImageLeftX <= finalLeftImageRightX || 
            img1ProposedWidth < this.MIN_IMAGE_DIMENSION ||
            img2ProposedWidth < this.MIN_IMAGE_DIMENSION) {
            console.warn("MultiStage - Stage 2: Inner refinement invalid or no gap. Splitting Stage 1 X-cropped area (full height).");
            return this._splitAreaInHalfVertically(outerX1, 0, stage1ContentWidth, imgHeight);
        }

        // --- Stage 3: Determine Vertical Crop Points Independently for each nominal image ---
        // For Left Image
        let img1_Y1 = 0;
        let img1_Y2 = -1; // Initialize to indicate no content found yet
        let foundImg1Top = false;
        for (let y = 0; y < imgHeight; y++) {
            if (this._getRowConsistency(imageData, y, outerX1, finalLeftImageRightX, imgWidth, imgHeight).percent < this.CONSISTENCY_THRESHOLD) {
                img1_Y1 = y;
                foundImg1Top = true;
                break;
            }
        }
        if (!foundImg1Top) { 
            console.warn("MultiStage - Stage 3: Left image part has all consistent rows vertically. Content height is 0.");
            // img1_Y1 remains 0, img1_Y2 remains -1, finalImg1Height will be 0 or less
        } else {
            img1_Y2 = imgHeight - 1; // Default to bottom if content was found at top
            for (let y = imgHeight - 1; y >= img1_Y1; y--) {
                if (this._getRowConsistency(imageData, y, outerX1, finalLeftImageRightX, imgWidth, imgHeight).percent < this.CONSISTENCY_THRESHOLD) {
                    img1_Y2 = y;
                    break;
                }
            }
        }

        // For Right Image
        let img2_Y1 = 0;
        let img2_Y2 = -1; // Initialize to indicate no content found yet
        let foundImg2Top = false;
        for (let y = 0; y < imgHeight; y++) {
            if (this._getRowConsistency(imageData, y, finalRightImageLeftX, outerX2, imgWidth, imgHeight).percent < this.CONSISTENCY_THRESHOLD) {
                img2_Y1 = y;
                foundImg2Top = true;
                break;
            }
        }
        if (!foundImg2Top) {
            console.warn("MultiStage - Stage 3: Right image part has all consistent rows vertically. Content height is 0.");
            // img2_Y1 remains 0, img2_Y2 remains -1, finalImg2Height will be 0 or less
        } else {
            img2_Y2 = imgHeight - 1; // Default to bottom if content was found at top
            for (let y = imgHeight - 1; y >= img2_Y1; y--) {
                if (this._getRowConsistency(imageData, y, finalRightImageLeftX, outerX2, imgWidth, imgHeight).percent < this.CONSISTENCY_THRESHOLD) {
                    img2_Y2 = y;
                    break;
                }
            }
        }
        console.log(`MultiStage - Stage 3: Img1 Y-bounds: ${img1_Y1}-${img1_Y2}. Img2 Y-bounds: ${img2_Y1}-${img2_Y2}`);

        const finalImg1Height = (img1_Y2 < img1_Y1) ? 0 : (img1_Y2 - img1_Y1 + 1);
        const finalImg2Height = (img2_Y2 < img2_Y1) ? 0 : (img2_Y2 - img2_Y1 + 1); // This is where line 662 might be

        // If EITHER image's determined height is too small, trigger fallback.
        if (finalImg1Height < this.MIN_IMAGE_DIMENSION || finalImg2Height < this.MIN_IMAGE_DIMENSION) {
            console.warn(`MultiStage - Stage 3: Derived height for one or both images is too small (H1: ${finalImg1Height}, H2: ${finalImg2Height}). Splitting Stage 1 X-cropped area using its original full height.`);
            return this._splitAreaInHalfVertically(outerX1, 0, stage1ContentWidth, imgHeight);
        }
        
        // --- Stage 4: Define Final Crop Regions using independent heights ---
        const region1W = finalLeftImageRightX - outerX1 + 1;
        const region2W = outerX2 - finalRightImageLeftX + 1;
        
        console.log(`MultiStage - Final Regions:
    Gap: ${finalRightImageLeftX - finalLeftImageRightX - 1},
    R1(x:${outerX1}, y:${img1_Y1}, w:${region1W}, h:${finalImg1Height}), 
    R2(x:${finalRightImageLeftX}, y:${img2_Y1}, w:${region2W}, h:${finalImg2Height})`);

        return {
            region1: { x: outerX1, y: img1_Y1, width: region1W, height: finalImg1Height },
            region2: { x: finalRightImageLeftX, y: img2_Y1, width: region2W, height: finalImg2Height }
        };
    }

    static _cropToImageObject(sourceImage, region) {
        return new Promise((resolve, reject) => {
            if (!region || region.width <= 0 || region.height <= 0) {
                return reject(new Error(`Invalid crop region: ${JSON.stringify(region)}`));
            }
            const canvas = document.createElement('canvas');
            canvas.width = region.width;
            canvas.height = region.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error("Failed to get 2D context for cropping canvas."));
            
            try {
                ctx.drawImage(
                    sourceImage,
                    region.x, region.y, region.width, region.height,
                    0, 0, region.width, region.height
                );
                const newImg = new Image();
                newImg.onload = () => resolve(newImg);
                newImg.onerror = (errEvent) => {
                    console.error("Error loading cropped image from dataURL:", errEvent);
                    reject(new Error("Cropped image could not be loaded from dataURL."));
                };
                newImg.src = canvas.toDataURL();
            } catch (e) {
                console.error("Error drawing image to crop canvas or creating dataURL:", e);
                reject(e);
            }
        });
    }

    static _finalizeImageLoading(loadedImages, loadedNames) {
        SIC.images = []; 
        if (typeof CropManager !== 'undefined' && CropManager.resetCrop) {
            CropManager.resetCrop();
        }
        SIC.images = loadedImages;
        SIC.imageNames = loadedNames;

        UIManager.domElements.canvasContainer.style.display = 'block';
        UIManager.domElements.dropzone.style.display = 'none';
        UIManager.updateImageNames();

        if (SIC.images.length === 2 && SIC.images[0] && SIC.images[1]) {
            const optimalScale = ImageRenderer.calculateMaxScale(SIC.images[0], SIC.images[1]);
            ImageRenderer.setScalePercent(ImageRenderer.currentScalePercent(), optimalScale);
            ImageRenderer.drawImages();

            UIManager.domElements.saveButton.disabled = false;
            UIManager.domElements.swapButton.disabled = false;
            if (typeof CropManager !== 'undefined' && typeof CropManager.setCropButtonDisabledState === 'function') {
                CropManager.setCropButtonDisabledState(false);
            }
        } else {
            console.error("Finalizing image loading with invalid images count or objects.", loadedImages);
            alert("There was an issue preparing the images for display.");
            UIManager.domElements.dropzone.style.display = 'flex';
            UIManager.domElements.canvasContainer.style.display = 'none';
        }
    }

    static processFiles(files) {
        if (files.length === 1) {
            const file = files[0];
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                const singleImg = new Image();
                singleImg.onload = () => {
                    console.log(this.CONSISTENCY_THRESHOLD, this.COLOR_DIFF_THRESHOLD_DELTA_E);
                    if (singleImg.width < this.MIN_IMAGE_DIMENSION * 2 || singleImg.height < this.MIN_IMAGE_DIMENSION) {
                        alert(`Image (${singleImg.width}x${singleImg.height}) is too small for analysis. Attempting simple split.`);
                        const fallbackRegions = this._splitAreaInHalfVertically(0,0,singleImg.width, singleImg.height);
                        if (fallbackRegions) {
                             Promise.all([
                                this._cropToImageObject(singleImg, fallbackRegions.region1),
                                this._cropToImageObject(singleImg, fallbackRegions.region2)
                            ]).then(([fb_img1, fb_img2]) => {
                                const baseName = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
                                const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
                                this._finalizeImageLoading([fb_img1, fb_img2], [`${baseName}_L_half${ext}`, `${baseName}_R_half${ext}`]);
                            }).catch(fbError => {
                                 console.error("Error with fallback image splitting for small image:", fbError);
                                 alert("Fallback image splitting failed. Please provide two separate images.");
                            });
                        } else {
                             alert("Image too small for any processing. Please provide a larger or two separate images.");
                        }
                        return;
                    }

                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = singleImg.width;
                    tempCanvas.height = singleImg.height;
                    const tempCtx = tempCanvas.getContext('2d');
                     if (!tempCtx) {
                         alert('Could not get canvas context for image analysis.');
                         return;
                    }
                    tempCtx.drawImage(singleImg, 0, 0);
                    let imageData;
                    try {
                        imageData = tempCtx.getImageData(0, 0, singleImg.width, singleImg.height);
                    } catch (e) {
                        console.error("Error getting imageData (cross-origin?):", e);
                        alert("Could not analyze image pixels. If it's from another website, please download it first, then upload from your computer.");
                        return;
                    }

                    const regions = this._analyzeAndExtractSubImageRegions_MultiStage(imageData, singleImg.width, singleImg.height);

                    if (regions && regions.region1 && regions.region2 &&
                        regions.region1.width >= this.MIN_IMAGE_DIMENSION && regions.region1.height >= this.MIN_IMAGE_DIMENSION &&
                        regions.region2.width >= this.MIN_IMAGE_DIMENSION && regions.region2.height >= this.MIN_IMAGE_DIMENSION) {
                        
                        Promise.all([
                            this._cropToImageObject(singleImg, regions.region1),
                            this._cropToImageObject(singleImg, regions.region2)
                        ]).then(([img1_obj, img2_obj]) => {
                            const baseName = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
                            const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
                            
                            this._finalizeImageLoading(
                                [img1_obj, img2_obj],
                                [`${baseName}_L${ext}`, `${baseName}_R${ext}`]
                            );
                        }).catch(error => {
                            console.error("Error cropping sub-images from single image:", error);
                            alert(`Failed to process the single image after analysis: ${error.message}. Attempting to split original image in half.`);
                            const fallbackRegions = this._splitAreaInHalfVertically(0,0,singleImg.width, singleImg.height);
                            if (fallbackRegions) {
                                Promise.all([
                                    this._cropToImageObject(singleImg, fallbackRegions.region1),
                                    this._cropToImageObject(singleImg, fallbackRegions.region2)
                                ]).then(([fb_img1, fb_img2]) => {
                                    const baseName = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
                                    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
                                    this._finalizeImageLoading([fb_img1, fb_img2], [`${baseName}_L_half${ext}`, `${baseName}_R_half${ext}`]);
                                }).catch(fbError => {
                                     console.error("Error with fallback image splitting:", fbError);
                                     alert("Fallback image splitting also failed. Please provide two separate images.");
                                     UIManager.domElements.dropzone.style.display = 'flex';
                                     UIManager.domElements.canvasContainer.style.display = 'none';
                                });
                            } else {
                                 alert("Image too small for fallback splitting. Please provide two separate images.");
                                 UIManager.domElements.dropzone.style.display = 'flex';
                                 UIManager.domElements.canvasContainer.style.display = 'none';
                            }
                        });
                    } else { 
                        console.warn("Analysis did not yield valid regions (or null returned from analysis). Defaulting to splitting original image in half.");
                        const fallbackRegions = this._splitAreaInHalfVertically(0,0,singleImg.width, singleImg.height);
                         if (fallbackRegions) {
                             Promise.all([
                                this._cropToImageObject(singleImg, fallbackRegions.region1),
                                this._cropToImageObject(singleImg, fallbackRegions.region2)
                            ]).then(([fb_img1, fb_img2]) => {
                                const baseName = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
                                const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
                                this._finalizeImageLoading([fb_img1, fb_img2], [`${baseName}_L_half${ext}`, `${baseName}_R_half${ext}`]);
                            }).catch(fbError => {
                                 console.error("Error with primary fallback image splitting:", fbError);
                                 alert("Primary fallback image splitting also failed. Please provide two separate images.");
                            });
                        } else {
                             alert("Image too small for any processing. Please provide two separate images.");
                        }
                         UIManager.domElements.dropzone.style.display = 'flex';
                         UIManager.domElements.canvasContainer.style.display = 'none';
                    }
                };
                singleImg.onerror = () => { alert("Could not load the single image file."); };
                singleImg.src = event.target.result;
            };
            reader.onerror = () => { alert("Could not read the single image file."); };
            reader.readAsDataURL(file);

        } else if (files.length === 2) {
            const newImages = [null, null]; 
            const newImageNames = [null, null];
            let loadedCount = 0;
            let errorOccurred = false;

            Array.from(files).forEach((file, index) => {
                if (errorOccurred) return; 
                if (!file.type.startsWith('image/')) {
                    alert('Please select only image files.');
                    errorOccurred = true;
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    if (errorOccurred) return;
                    const img = new Image();
                    img.onload = () => {
                        if (errorOccurred) return;
                        newImageNames[index] = file.name;
                        newImages[index] = img;
                        loadedCount++;

                        if (loadedCount === 2) {
                           if (newImages[0] && newImages[1]) {
                               this._finalizeImageLoading(newImages, newImageNames);
                           } else { 
                               alert("There was an issue loading one or both of the images. Please try again.");
                           }
                        }
                    };
                    img.onerror = () => {
                        if (errorOccurred) return; 
                        alert(`Could not load image: ${file.name}`);
                        errorOccurred = true; 
                        loadedCount++; 
                        if (loadedCount === 2) { 
                            if (!(newImages[0] && newImages[1])) { 
                                alert("One or more images failed to load. Please try again.");
                            }
                        }
                    };
                    img.src = event.target.result;
                };
                reader.onerror = () => {
                    if (errorOccurred) return;
                    alert(`Could not read file: ${file.name}`);
                    errorOccurred = true;
                };
                reader.readAsDataURL(file);
            });
        } else {
            alert('Please select one or two images.');
        }
    }

    static saveImage() {
        const format = UIManager.domElements.formatSelect.value;
        
        if (UIManager.isTransparent && format === 'image/jpeg') {
            alert('JPG format does not support transparency. Please choose PNG format to preserve transparency, or uncheck the Transparent option.');
            return;
        }

        const saveCanvas = document.createElement('canvas');
        if (!SIC.images || SIC.images.length !== 2 || !SIC.images[0] || !SIC.images[1]) {
            alert("Cannot save, images are not properly loaded.");
            return;
        }
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

    /**
     * Finds the common prefix of two strings, trying to end at a natural separator.
     * It also cleans trailing separators from the result.
     * (This is the version from your provided stereo-combiner.js)
     */
    static findCommonPrefixLastSeparator(str1, str2) {
        if (!str1 || !str2 ) return '';
        
        let commonLength = 0;
        for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
            // Case-insensitive comparison for the common part
            if (str1.charAt(i).toLowerCase() !== str2.charAt(i).toLowerCase()) break;
            commonLength = i + 1;
        }
        if (commonLength === 0) return '';

        let commonPart = str1.substring(0, commonLength);
        
        // If one string is an exact prefix of the other (or they are identical up to commonLength)
        // return the cleaned commonPart.
        if (commonPart.length === str1.length || commonPart.length === str2.length) {
            return commonPart.replace(/[-_\s]+$/, ''); 
        }

        const separators = ['_', '-', ' '];
        let lastSepPos = -1;
        // Find the last separator *within this commonPart*
        for (const sep of separators) {
            const pos = commonPart.lastIndexOf(sep);
            if (pos > lastSepPos) { 
                lastSepPos = pos;
            }
        }
        
        if (lastSepPos !== -1) {
            // Return part up to AND INCLUDING the separator, then clean trailing separators from this result
            return commonPart.substring(0, lastSepPos + 1).replace(/[-_\s]+$/, '');
        } 
        // No separator in common part, but common part exists. 
        // Return if it's a meaningful length, cleaned.
        return commonPart.length > 2 ? commonPart.replace(/[-_\s]+$/, '') : ''; 
    }

    /**
     * Removes a given prefix from the start of a name, if present.
     * Also removes an immediately following separator (space, _, -) and trims leading spaces from the result.
     * Comparison is case-insensitive.
     * @param {string} name The name to strip.
     * @param {string} userInputPrefix The prefix to remove.
     * @returns {string} The name with the prefix stripped, or the original name.
     */
    static _stripUserInputPrefix(name, userInputPrefix) {
        if (!userInputPrefix || !name) {
            return name;
        }
        const prefixLower = userInputPrefix.toLowerCase();
        const nameLower = name.toLowerCase();

        if (nameLower.startsWith(prefixLower)) {
            let strippedName = name.substring(userInputPrefix.length);
            // If the character immediately after the prefix was a common separator, remove it too.
            if (strippedName.length > 0 && [' ', '_', '-'].includes(strippedName.charAt(0))) {
                strippedName = strippedName.substring(1);
            }
            return strippedName.trimStart(); // Remove any further leading spaces
        }
        return name;
    }

    /**
     * Finds the common prefix of two strings, trying to end at a natural separator.
     * (This is the version from your previously provided stereo-combiner.js - ensure it's correct in your file)
     */
    static findCommonPrefixLastSeparator(str1, str2) {
        if (!str1 || !str2 ) return '';
        
        let commonLength = 0;
        for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
            if (str1.charAt(i).toLowerCase() !== str2.charAt(i).toLowerCase()) break;
            commonLength = i + 1;
        }
        if (commonLength === 0) return '';

        let commonPart = str1.substring(0, commonLength);
        
        if (commonPart.length === str1.length || commonPart.length === str2.length) {
            return commonPart.replace(/[-_\s]+$/, ''); 
        }

        const separators = ['_', '-', ' '];
        let lastSepPos = -1;
        for (const sep of separators) {
            const pos = commonPart.lastIndexOf(sep);
            if (pos > lastSepPos) { 
                lastSepPos = pos;
            }
        }
        
        if (lastSepPos !== -1) {
            return commonPart.substring(0, lastSepPos + 1).replace(/[-_\s]+$/, '');
        } 
        return commonPart.length > 2 ? commonPart.replace(/[-_\s]+$/, '') : ''; 
    }

    /**
     * Creates a combined filename.
     */
    static createCombinedFilename() {
        const userInputPrefix = UIManager.domElements.filenamePrefixInput.value.trim();
        const imageNames = SIC.imageNames;
        const DEFAULT_CORE_NAME = "stereo_image";
        const MIN_CORE_LENGTH = 3; // Minimum length for a derived core name to be considered "good"

        if (!imageNames || imageNames.length < 2 || !imageNames[0] || !imageNames[1]) {
            return userInputPrefix ? `${userInputPrefix} ${DEFAULT_CORE_NAME}`.trim() : DEFAULT_CORE_NAME;
        }

        let baseName1_noExt = imageNames[0].includes('.') ? 
            imageNames[0].substring(0, imageNames[0].lastIndexOf('.')) : 
            imageNames[0];
        let baseName2_noExt = imageNames[1].includes('.') ? 
            imageNames[1].substring(0, imageNames[1].lastIndexOf('.')) : 
            imageNames[1];

        // 1. Normalize baseNames by removing the userInputPrefix from their start
        const normalizedBaseName1 = this._stripUserInputPrefix(baseName1_noExt, userInputPrefix);
        const normalizedBaseName2 = this._stripUserInputPrefix(baseName2_noExt, userInputPrefix);
        
        let finalNameCore;

        // Proceed only if normalized names are somewhat valid
        if ((!normalizedBaseName1 || normalizedBaseName1.length < 1) && 
            (!normalizedBaseName2 || normalizedBaseName2.length < 1)) {
            // Both names became empty/invalid after stripping user prefix
            finalNameCore = DEFAULT_CORE_NAME;
        } else if (!normalizedBaseName1 || normalizedBaseName1.length < 1) {
            // Only normalizedBaseName2 is potentially valid, but we can't find a "common" part.
            // To avoid using a unique part (normalizedBaseName2), use default.
            finalNameCore = DEFAULT_CORE_NAME;
        } else if (!normalizedBaseName2 || normalizedBaseName2.length < 1) {
            // Only normalizedBaseName1 is potentially valid.
            finalNameCore = DEFAULT_CORE_NAME;
        } else {
            // Both normalized names are non-empty, try to find common prefix.
            finalNameCore = this.findCommonPrefixLastSeparator(normalizedBaseName1, normalizedBaseName2);
        }
        
        // If common prefix is too short or empty, use default
        if (!finalNameCore || finalNameCore.trim().length < MIN_CORE_LENGTH) {
            console.warn(`Derived common core name "${finalNameCore}" is too short or empty. Using default.`);
            finalNameCore = DEFAULT_CORE_NAME;
        } else {
            finalNameCore = finalNameCore.trim(); // Ensure no leading/trailing spaces from common part
        }

        // Prepend userInputPrefix if it exists, ensuring no double prefixing or double spacing
        if (userInputPrefix) {
            // Check if the derived finalNameCore ALREADY starts with the userInputPrefix
            // (This would only happen if findCommonPrefixLastSeparator coincidentally returned it,
            // despite us stripping it from the inputs to that function). This is a safeguard.
            const coreLower = finalNameCore.toLowerCase();
            const prefixLower = userInputPrefix.toLowerCase();
            if (coreLower.startsWith(prefixLower) && 
                (coreLower.length === prefixLower.length || coreLower.charAt(prefixLower.length) === ' ')) {
                // finalNameCore already seems to contain the prefix correctly
                return finalNameCore;
            }
            return `${userInputPrefix} ${finalNameCore}`;
        }
        
        return finalNameCore;
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
    static BODY_BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--body-bg-color').trim();
    static DEFAULT_SCALE_PERCENT = 100;
    static scale = 1;
    static maxScale = 1;

    static currentScalePercent() {
        return this.scale / this.maxScale;
    }

    static calculateMaxScale(img1, img2, overlaid = false, borders = true) {
        let totalWidthAt100;
        let imageHeight = Math.max(img1.height, img2.height);

        if (!overlaid) {
            const gapWidthAt100 = Math.round(this.pixelGap(img1, img2) / UIManager.GAP_TO_BORDER_RATIO) * UIManager.GAP_TO_BORDER_RATIO;
            const borderSpace = UIManager.hasBorders && borders ? gapWidthAt100 / UIManager.GAP_TO_BORDER_RATIO : 0;
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
        return avgWidth * (UIManager.gapPercent / 100);
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
            renderGap = Math.round(this.pixelGap(SIC.images[0], SIC.images[1]) / UIManager.GAP_TO_BORDER_RATIO) * UIManager.GAP_TO_BORDER_RATIO * renderScale;
            if (UIManager.hasBorders) {
                borderSpace = renderGap / UIManager.GAP_TO_BORDER_RATIO;
            }
            if (renderScale === 1) console.log(renderGap, borderSpace, SIC.images[0].width, SIC.images[0].height, SIC.images[1].width, SIC.images[1].height)
        } else {
            renderGap = avgWidth * (UIManager.gapPercent / 100);
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
            if (UIManager.isTransparent) {
                ctx.clearRect(0, 0, totalWidth, maxHeight);
            } else {
                ctx.fillStyle = UIManager.gapColor;
                ctx.fillRect(0, 0, totalWidth, maxHeight);
            }
        } else {
            // Crop mode background
            ctx.fillStyle = this.BODY_BG_COLOR;
            ctx.fillRect(0, 0, totalWidth, maxHeight);

            // Fill gap area
            const gapStart = Math.max(yOffsets.left, yOffsets.right);
            const gapHeight = Math.min(img1Height + yOffsets.left, img2Height + yOffsets.right) - gapStart;

            if (UIManager.isTransparent) {
                ctx.clearRect(
                    img1Width + borderSpace,
                    gapStart + borderSpace,
                    renderGap,
                    gapHeight
                );
            } else {
                ctx.fillStyle = UIManager.gapColor;
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
        if (!cropping && UIManager.cornerRadiusPercent > 0) {
            const maxRadius = Math.min(img1Width, img2Width, img1Height, img2Height) / 2;
            const renderCornerRadius = UIManager.cornerRadiusPercent / 100 * maxRadius;

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
