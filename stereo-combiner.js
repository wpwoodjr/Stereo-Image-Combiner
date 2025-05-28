// ===================================
// CORE StereoImageCombiner MODULE - Main application state and initialization
// ===================================
class SIC {
    static DEBUG = false;
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
        this.resetToDropzone();
        this.resetControlsToDefaults();
    }

    // Resets the UI to show the dropzone and hide the canvas.
    static resetToDropzone() {
        SIC.images = [];
        SIC.imageNames = [];
        this.updateImageNames();
        this.domElements.dropzone.style.display = 'flex';
        this.domElements.canvasContainer.style.display = 'none';
        this.domElements.saveButton.disabled = true;
        this.domElements.swapButton.disabled = true;

        CropManager.resetCrop();
        CropManager.setCropButtonDisabledState(true);
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
        let text = "Drag and drop one image (for auto-split) or two images here, or click to browse";
        if (window.matchMedia('(pointer: fine)').matches) {
            text += "<br><small>(Hold Ctrl or ⌘ while clicking to select two images)</small>";
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
    static HARD_GAP_CROP = false;

    static async _cropRegions(sourceImage, regions, baseName, ext) {
        const { region1, region2 } = regions;
        // width without gap
        const r1Width = region1.x + region1.width;
        const r2Width = sourceImage.width - region2.x;
        const gapSize = region2.x - r1Width;
        const gapCenter = r1Width + Math.floor(gapSize / 2);

        const cropR1 = { x: 0, y: 0, width: r1Width, height: sourceImage.height };
        const cropR2 = { x: region2.x, y: 0, width: r2Width, height: sourceImage.height };
        let rightGapSize = 0;
        if (!this.HARD_GAP_CROP) {
            cropR1.width = gapCenter;
            cropR2.x = gapCenter;
            cropR2.width = sourceImage.width - gapCenter;
            rightGapSize = region2.x - gapCenter;
        }

        try {
            const [img1_obj, img2_obj] = await Promise.all([
                this._cropToImageObject(sourceImage, cropR1),
                this._cropToImageObject(sourceImage, cropR2)
            ]);
            this._finalizeImageLoading(
                [img1_obj, img2_obj],
                [`${baseName}_L${ext}`, `${baseName}_R${ext}`],
                false
            );
        } catch (cropError) {
            console.error("Error cropping sub-images from single image after analysis:", cropError);
            await this._executeFallbackSplit(singleImg, baseName, ext, "Error cropping analyzed sub-images");
            return;
        }

        const regionsWithoutGap = { region1: { ... region1 }, region2: { ...region2, x: rightGapSize } };
        CropManager.setCropState(regionsWithoutGap);
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

    static _finalizeImageLoading(loadedImages, loadedNames, draw = true) {
        SIC.images = [];
        CropManager.resetCrop();
        SIC.images = loadedImages;
        SIC.imageNames = loadedNames;

        UIManager.domElements.canvasContainer.style.display = 'block';
        UIManager.domElements.dropzone.style.display = 'none';
        UIManager.updateImageNames();

        if (SIC.images.length === 2 && SIC.images[0] && SIC.images[1]) {
            const optimalScale = ImageRenderer.calculateMaxScale(SIC.images[0], SIC.images[1]);
            ImageRenderer.setScalePercent(ImageRenderer.currentScalePercent(), optimalScale);
            if (draw) {
                ImageRenderer.drawImages();
            }

            UIManager.domElements.saveButton.disabled = false;
            UIManager.domElements.swapButton.disabled = false;
            CropManager.setCropButtonDisabledState(false);
        } else {
            console.error("Finalizing image loading with invalid image count or objects.", loadedImages);
            alert("There was an issue preparing the images for display.");
            UIManager.resetToDropzone(); // Use helper to reset UI
        }
    }

    /**
     * Loads an image from a File object.
     * @param {File} file - The file to load.
     * @returns {Promise<{image: HTMLImageElement, name: string}>} A promise that resolves with the loaded image and its name.
     * @private
     */
    static _loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    resolve({ image: img, name: file.name });
                };
                img.onerror = () => {
                    const errorMsg = `Could not load image: ${file.name}`;
                    alert(errorMsg);
                    reject(new Error(errorMsg));
                };
                img.src = event.target.result;
            };
            reader.onerror = () => {
                const errorMsg = `Could not read file: ${file.name}`;
                alert(errorMsg);
                reject(new Error(errorMsg));
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * Extracts the base name and extension from a filename.
     * @param {string} fileName - The full filename.
     * @returns {{baseName: string, ext: string}} An object containing the base name and extension.
     * @private
     */
    static _generateImageNameParts(fileName) {
        const baseName = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
        const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
        return { baseName, ext };
    }

    /**
     * Executes a fallback mechanism to split an image in half if primary processing fails.
     * @param {HTMLImageElement} originalImage - The image to split.
     * @param {string} baseName - The base name for the resulting files.
     * @param {string} ext - The extension for the resulting files.
     * @param {string} contextMessage - A message for console logging about why fallback is triggered.
     * @private
     */
    static async _executeFallbackSplit(originalImage, baseName, ext, contextMessage) {
        console.warn(`Executing fallback split due to: ${contextMessage}`);
        const fallbackRegions = BorderFinder.splitAreaInHalfVertically(0, 0, originalImage.width, originalImage.height);
        if (fallbackRegions) {
            try {
                const [fb_img1, fb_img2] = await Promise.all([
                    this._cropToImageObject(originalImage, fallbackRegions.region1),
                    this._cropToImageObject(originalImage, fallbackRegions.region2)
                ]);
                this._finalizeImageLoading(
                    [fb_img1, fb_img2],
                    [`${baseName}_L_half${ext}`, `${baseName}_R_half${ext}`]
                );
            } catch (fbError) {
                console.error(`Error during fallback image splitting (${contextMessage}):`, fbError);
                alert(`Fallback image splitting failed: ${fbError.message}. Please provide two separate images.`);
                UIManager.resetToDropzone();
            }
        } else {
            alert("Image too small for any processing, even fallback splitting. Please provide a larger or two separate images.");
            UIManager.resetToDropzone();
        }
    }

    /**
     * Processes dropped or selected image files.
     * Can handle a single image (attempts to auto-split) or two separate images.
     * @param {FileList} files - The list of files to process.
     */
    static async processFiles(files) {
        if (files.length === 1) {
            const file = files[0];
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file.');
                return;
            }

            let singleImg, originalName;
            try {
                const loadedFile = await this._loadImageFromFile(file);
                singleImg = loadedFile.image;
                originalName = loadedFile.name;
            } catch (error) {
                console.error("Error loading single image:", error.message || error);
                alert('Error loading single image.');
                UIManager.resetToDropzone();
                return;
            }

            const { baseName, ext } = this._generateImageNameParts(originalName);

            const regions = BorderFinder.analyzeAndExtractSubImageRegions_MultiStage(singleImg);

            if (regions && regions.region1 && regions.region2) {
                await this._cropRegions(singleImg, regions, baseName, ext);
            } else {
                await this._executeFallbackSplit(singleImg, baseName, ext, "Analysis yielded invalid/null regions");
            }

        } else if (files.length === 2) {
            try {
                for (const file of files) {
                    if (!file.type.startsWith('image/')) {
                        alert('Please select only image files.');
                        return;
                    }
                }

                const imageLoadPromises = Array.from(files).map(file => this._loadImageFromFile(file));
                const loadedImageResults = await Promise.all(imageLoadPromises);

                const newImages = loadedImageResults.map(result => result.image);
                const newImageNames = loadedImageResults.map(result => result.name);
                
                this._finalizeImageLoading(newImages, newImageNames);

            } catch (error) {
                console.error("Error loading two images:", error.message || error);
                alert('Error loading two images.');
                UIManager.resetToDropzone();
            }
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
        ImageRenderer.renderCombinedImage(saveCanvas, 1, {}); // Pass scale 1 for full resolution

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
     * Creates a combined filename.
     */
    static createCombinedFilename() {
        const userInputPrefix = UIManager.domElements.filenamePrefixInput.value.trim();
        const imageNames = SIC.imageNames;
        const DEFAULT_CORE_NAME = "stereo_image";
        const MIN_CORE_LENGTH = 3; 

        if (!imageNames || imageNames.length < 2 || !imageNames[0] || !imageNames[1]) {
            return userInputPrefix ? `${userInputPrefix} ${DEFAULT_CORE_NAME}`.trim() : DEFAULT_CORE_NAME;
        }

        let baseName1_noExt = imageNames[0].includes('.') ? 
            imageNames[0].substring(0, imageNames[0].lastIndexOf('.')) : 
            imageNames[0];
        let baseName2_noExt = imageNames[1].includes('.') ? 
            imageNames[1].substring(0, imageNames[1].lastIndexOf('.')) : 
            imageNames[1];

        const normalizedBaseName1 = this._stripUserInputPrefix(baseName1_noExt, userInputPrefix);
        const normalizedBaseName2 = this._stripUserInputPrefix(baseName2_noExt, userInputPrefix);
        
        let finalNameCore;

        if ((!normalizedBaseName1 || normalizedBaseName1.length < 1) && 
            (!normalizedBaseName2 || normalizedBaseName2.length < 1)) {
            finalNameCore = DEFAULT_CORE_NAME;
        } else if (!normalizedBaseName1 || normalizedBaseName1.length < 1) {
            finalNameCore = normalizedBaseName2;
        } else if (!normalizedBaseName2 || normalizedBaseName2.length < 1) {
            finalNameCore = normalizedBaseName1;
        } else {
            finalNameCore = this.findCommonPrefixLastSeparator(normalizedBaseName1, normalizedBaseName2);
        }
        
        if (!finalNameCore || finalNameCore.trim().length < MIN_CORE_LENGTH) {
            console.warn(`Derived common core name "${finalNameCore}" is too short or empty. Using default.`);
            finalNameCore = DEFAULT_CORE_NAME;
        } else {
            finalNameCore = finalNameCore.trim();
        }

        if (userInputPrefix) {
            const coreLower = finalNameCore.toLowerCase();
            const prefixLower = userInputPrefix.toLowerCase();
            if (coreLower.startsWith(prefixLower) && 
                (coreLower.length === prefixLower.length || [' ', '_', '-'].includes(coreLower.charAt(prefixLower.length)))) {
                return finalNameCore; // Already contains prefix, or prefix is the start of the core
            }
            // Ensure a space if both prefix and core are non-empty and core doesn't start with the prefix already
            return `${userInputPrefix} ${finalNameCore}`.trim(); // Trim in case finalNameCore was empty
        }
        
        return finalNameCore;
    }
}

// ===================================
// Border finder - finds the gap and borders
// ===================================
class BorderFinder {
    static MIN_IMAGE_DIMENSION = 10;

    // Thresholds for color consistency detection
    static DELTA_E_SIMILARITY_THRESHOLD = 15.0; // Perceptual difference for determining similarity of RGB (Delta E 76)
    static DELTA_E_DIFFERENCE_THRESHOLD = 48.0; // Perceptual difference for determining difference of RGB (Delta E 76)
    static ALPHA_DIFF_THRESHOLD = 10;           // Absolute difference for alpha channel
    static CONSISTENCY_THRESHOLD = 0.99;        // Target for augmented dominant color percentage

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
    static _isColorDifferenceSignificant(rgba1, rgba2, colorDiffThresholdDeltaE) {
        if (!rgba1 || !rgba2) return true; 
        if (Math.abs(rgba1.a - rgba2.a) > this.ALPHA_DIFF_THRESHOLD) return true;

        const xyz1 = this._rgbToXyz(rgba1.r, rgba1.g, rgba1.b);
        const lab1 = this._xyzToLab(xyz1.x, xyz1.y, xyz1.z);
        const xyz2 = this._rgbToXyz(rgba2.r, rgba2.g, rgba2.b);
        const lab2 = this._xyzToLab(xyz2.x, xyz2.y, xyz2.z);
        const deltaE = this._deltaE76(lab1, lab2);
        if (SIC.DEBUG && colorDiffThresholdDeltaE === this.DELTA_E_DIFFERENCE_THRESHOLD) {
            console.log(`delta E: ${deltaE}`);
        }
        return deltaE > colorDiffThresholdDeltaE;
    }

    // try and contract a bound by looking for an edge determined by a big color difference
    static _contractColumnBounds(consistencyData, imageData, colX, incr, yStart, yEnd, imgWidth, imgHeight) {
        const newConsistencyData = this._getColumnConsistency(imageData, colX + incr, yStart, yEnd, imgWidth, imgHeight);
        if (this._isColorDifferenceSignificant(consistencyData.dominantColor, newConsistencyData.dominantColor, this.DELTA_E_DIFFERENCE_THRESHOLD)) {
            return colX + incr;
        }
        return colX;
    }

    // try and contract a bound by looking for an edge determined by a big color difference
    static _contractRowBounds(consistencyData, imageData, rowY, incr, xStart, xEnd, imgWidth, imgHeight) {
        const newConsistencyData = this._getRowConsistency(imageData, rowY + incr, xStart, xEnd, imgWidth, imgHeight);
        if (this._isColorDifferenceSignificant(consistencyData.dominantColor, newConsistencyData.dominantColor, this.DELTA_E_DIFFERENCE_THRESHOLD)) {
            return rowY + incr;
        }
        return rowY;
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

        if (!initialDominantColorStr) return { dominantColor: null, percent: 0, totalPixels: totalValidPixels };

        const initialDominantColor = uniqueColors.get(initialDominantColorStr);
        let augmentedDominantCount = initialMaxCount;

        for (const [pStr, count] of counts) {
            if (pStr === initialDominantColorStr) continue;
            const otherColor = uniqueColors.get(pStr);
            if (!this._isColorDifferenceSignificant(initialDominantColor, otherColor, this.DELTA_E_SIMILARITY_THRESHOLD)) {
                augmentedDominantCount += count; // Add count of similar colors
            }
        }
        
        const finalConsistencyPercent = totalValidPixels > 0 ? augmentedDominantCount / totalValidPixels : 1.0;
        if (SIC.DEBUG) {
            if (finalConsistencyPercent < this.CONSISTENCY_THRESHOLD) {
                console.log(`Consistency check failed:
    column: ${colX},
    color: ${initialDominantColorStr},
    consistency: ${(finalConsistencyPercent * 100).toFixed(1)}%,
    initial count: ${initialMaxCount},
    augmented count: ${augmentedDominantCount}`);
            }
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
         if (!initialDominantColorStr) return { dominantColor: null, percent: 0, totalPixels: totalValidPixels };

        const initialDominantColor = uniqueColors.get(initialDominantColorStr);
        let augmentedDominantCount = initialMaxCount;

        for (const [pStr, count] of counts) {
            if (pStr === initialDominantColorStr) continue;
            const otherColor = uniqueColors.get(pStr);
            if (!this._isColorDifferenceSignificant(initialDominantColor, otherColor, this.DELTA_E_SIMILARITY_THRESHOLD)) {
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

    /**
     * Gets ImageData from an HTMLImageElement.
     * @param {HTMLImageElement} imageElement - The image to process.
     * @returns {ImageData|null} The ImageData object or null if an error occurs.
     * @private
     */
    static _getImageDataFromImage(imageElement) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageElement.width;
        tempCanvas.height = imageElement.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
            alert('Could not get canvas context for image analysis.');
            return null;
        }
        tempCtx.drawImage(imageElement, 0, 0);
        try {
            return tempCtx.getImageData(0, 0, imageElement.width, imageElement.height);
        } catch (e) {
            console.error("Error getting imageData (cross-origin?):", e);
            alert("Could not analyze image pixels. If it's from another website, please download it first, then upload from your computer.");
            return null;
        }
    }

    static splitAreaInHalfVertically(x, y, width, height) {
        if (width < this.MIN_IMAGE_DIMENSION * 2 || height < this.MIN_IMAGE_DIMENSION) {
             console.warn(`Area ${width}x${height} at (${x},${y}) is too small to split meaningfully.`);
             return null; 
        }
        const w1 = Math.floor(width / 2);
        const w2 = width - w1; 
        if (SIC.DEBUG) {
            console.log(`Splitting image in half:
    Img1(x:${x}, y:${y}, w:${w1}, h:${height}), 
    Img1(x:${x + w1}, y:${y}, w:${w2}, h:${height})`);
        }
        return {
            region1: { x: x, y: y, width: w1, height: height },
            region2: { x: x + w1, y: y, width: w2, height: height }
        };
    }

    static analyzeAndExtractSubImageRegions_MultiStage(singleImg) {
        const imgWidth = singleImg.width;
        const imgHeight = singleImg.height;

        if (imgWidth < this.MIN_IMAGE_DIMENSION * 2 || imgHeight < this.MIN_IMAGE_DIMENSION) {
            return null;
        }

        const imageData = this._getImageDataFromImage(singleImg);
        if (!imageData) {
            return null;
        }

        if (SIC.DEBUG) {
            console.log(`Analyzing image borders and gap with:
    Consistency threshold: ${this.CONSISTENCY_THRESHOLD * 100}%,
    Similarity Delta E: ${this.DELTA_E_SIMILARITY_THRESHOLD},
    Difference Delta E: ${this.DELTA_E_DIFFERENCE_THRESHOLD},
    Width: ${imgWidth}, Height: ${imgHeight}`);
        }

        const consistencyData = {};
        // --- Stage 1: Determine Outer Horizontal Crop Points ---
        let outerX1 = imgWidth;
        for (let x = 0; x < imgWidth; x++) {
            consistencyData.outerX1 = this._getColumnConsistency(imageData, x, 0, imgHeight - 1, imgWidth, imgHeight);
            if (consistencyData.outerX1.percent < this.CONSISTENCY_THRESHOLD) {
                outerX1 = x;
                break;
            }
        }

        let outerX2 = -1; 
        for (let x = imgWidth - 1; x >= outerX1; x--) { 
            consistencyData.outerX2 = this._getColumnConsistency(imageData, x, 0, imgHeight - 1, imgWidth, imgHeight);
            if (consistencyData.outerX2.percent < this.CONSISTENCY_THRESHOLD) {
                outerX2 = x;
                break;
            }
        }

        if (outerX1 >= imgWidth || outerX2 < 0 || outerX2 < outerX1) { 
            console.warn("Stage 1: Entire image has no valid content. Splitting original image in half.");
            return this.splitAreaInHalfVertically(0, 0, imgWidth, imgHeight);
        }

        const stage1ContentWidth = outerX2 - outerX1 + 1;
        if (stage1ContentWidth < this.MIN_IMAGE_DIMENSION * 2) {
            console.warn(`Stage 1: Content width ${stage1ContentWidth} is too small. Splitting original image in half.`);
            return this.splitAreaInHalfVertically(0, 0, imgWidth, imgHeight);
        }
        if (SIC.DEBUG) {
            console.log(`Stage 1 (find outer X boundaries):
    Outer X-bounds: ${outerX1} to ${outerX2},
    Width: ${stage1ContentWidth}`);
        }

        // --- Stage 2: Split the Stage 1 cropped area and Refine Inner Horizontal Edges to find the Gap ---
        let innerX1 = 0;
        let innerX2 = 0;
        let gapSize = 0;
        const bounds = [
            { left: outerX1, width: stage1ContentWidth },
            { left: 0, width: imgWidth }
        ];
        // look for gap with left and right of cropped image; failing that, original image left and right
        for (const { left, width } of bounds) {
            const nominalSplitPointAbsolute = left + Math.floor(width / 2);
            if (SIC.DEBUG) {
                console.log(`Looking for gap at: ${nominalSplitPointAbsolute}`);
            }

            innerX1 = left - 1;
            for (let currentX = nominalSplitPointAbsolute - 1; currentX >= left; currentX--) {
                consistencyData.innerX1 = this._getColumnConsistency(imageData, currentX, 0, imgHeight - 1, imgWidth, imgHeight);
                if (consistencyData.innerX1.percent < this.CONSISTENCY_THRESHOLD) {
                    innerX1 = currentX; 
                    break;
                }
            }

            const right = left + width - 1;
            innerX2 = right + 1;
            for (let currentX = nominalSplitPointAbsolute; currentX <= right; currentX++) {
                consistencyData.innerX2 = this._getColumnConsistency(imageData, currentX, 0, imgHeight - 1, imgWidth, imgHeight);
                if (consistencyData.innerX2.percent < this.CONSISTENCY_THRESHOLD) {
                    innerX2 = currentX; 
                    break;
                }
            }

            gapSize = innerX2 - innerX1 - 1;
            // break early if gap found or if cropped area = original area
            if (gapSize > 0 || width === imgWidth) {
                break;
            }
        }

        const img1ProposedWidth = innerX1 - outerX1 + 1;
        const img2ProposedWidth = outerX2 - innerX2 + 1;
        if (SIC.DEBUG) {
            console.log(`Stage 2 (find gap):
    Found gap at: ${innerX1 + 1}, size: ${gapSize},
    Img1(x:${outerX1}, w:${img1ProposedWidth}),
    Img2(x:${innerX2}, w:${img2ProposedWidth})`);
        }

        if (innerX2 <= innerX1 || 
            img1ProposedWidth < this.MIN_IMAGE_DIMENSION ||
            img2ProposedWidth < this.MIN_IMAGE_DIMENSION) {
            console.warn("Stage 2: Gap refinement invalid. Splitting original image in half.");
            return this.splitAreaInHalfVertically(0, 0, imgWidth, imgHeight);
        }

        // --- Stage 3: Determine Vertical Crop Points Independently for each nominal image ---
        let topY1 = 0, bottomY1 = -1, foundImg1Top = false;
        for (let y = 0; y < imgHeight; y++) {
            consistencyData.topY1 = this._getRowConsistency(imageData, y, outerX1, innerX1, imgWidth, imgHeight);
            if (consistencyData.topY1.percent < this.CONSISTENCY_THRESHOLD) {
                topY1 = y; foundImg1Top = true; break;
            }
        }
        if (!foundImg1Top) { 
            console.warn("Stage 3: Left image part has no rows with content.");
        } else {
            bottomY1 = imgHeight - 1;
            for (let y = imgHeight - 1; y >= topY1; y--) {
                consistencyData.bottomY1 = this._getRowConsistency(imageData, y, outerX1, innerX1, imgWidth, imgHeight);
                if (consistencyData.bottomY1.percent < this.CONSISTENCY_THRESHOLD) {
                    bottomY1 = y; break;
                }
            }
        }

        let topY2 = 0, bottomY2 = -1, foundImg2Top = false;
        for (let y = 0; y < imgHeight; y++) {
            consistencyData.topY2 = this._getRowConsistency(imageData, y, innerX2, outerX2, imgWidth, imgHeight);
            if (consistencyData.topY2.percent < this.CONSISTENCY_THRESHOLD) {
                topY2 = y; foundImg2Top = true; break;
            }
        }
        if (!foundImg2Top) {
            console.warn("Stage 3: Right image part has no rows with content.");
        } else {
            bottomY2 = imgHeight - 1;
            for (let y = imgHeight - 1; y >= topY2; y--) {
                consistencyData.bottomY2 = this._getRowConsistency(imageData, y, innerX2, outerX2, imgWidth, imgHeight);
                if (consistencyData.bottomY2.percent < this.CONSISTENCY_THRESHOLD) {
                    bottomY2 = y; break;
                }
            }
        }
        if (SIC.DEBUG) {
            console.log(`Stage 3 (find outer Y boundaries):
    Img1 Y-bounds: ${topY1} - ${bottomY1},
    Img2 Y-bounds: ${topY2} - ${bottomY2}`);
        }

        const img1ProposedHeight = (bottomY1 < topY1) ? 0 : (bottomY1 - topY1 + 1);
        const img2ProposedHeight = (bottomY2 < topY2) ? 0 : (bottomY2 - topY2 + 1);

        // If EITHER image's determined height is too small, trigger fallback.
        if (img1ProposedHeight < this.MIN_IMAGE_DIMENSION || img2ProposedHeight < this.MIN_IMAGE_DIMENSION) {
            console.warn(`Stage 3:
Height for one or both images is too small:
    H1: ${img1ProposedHeight}, H2: ${img2ProposedHeight}
Splitting original image in half.`);
            return this.splitAreaInHalfVertically(0, 0, imgWidth, imgHeight);
        }

        // --- Stage 4: Try and contract the bounds a bit more by looking for transition edges ---
        if (SIC.DEBUG) {
            console.log(`Stage 4 (contract boundaries)`);
        }

        // contract left and right image X bounds
        outerX1 = this._contractColumnBounds(consistencyData.outerX1, imageData, outerX1, 1, topY1, bottomY1, imgWidth, imgHeight);
        outerX2 = this._contractColumnBounds(consistencyData.outerX2, imageData, outerX2, -1, topY2, bottomY2, imgWidth, imgHeight);
        innerX1 = this._contractColumnBounds(consistencyData.innerX1, imageData, innerX1, -1, topY1, bottomY1, imgWidth, imgHeight);
        innerX2 = this._contractColumnBounds(consistencyData.innerX2, imageData, innerX2, 1, topY2, bottomY2, imgWidth, imgHeight);
        gapSize = innerX2 - innerX1 - 1;

        // contract left and right image Y bounds
        topY1 = this._contractRowBounds(consistencyData.topY1, imageData, topY1, 1, outerX1, innerX1, imgWidth, imgHeight);
        bottomY1 = this._contractRowBounds(consistencyData.bottomY1, imageData, bottomY1, -1, outerX1, innerX1, imgWidth, imgHeight);
        topY2 = this._contractRowBounds(consistencyData.topY2, imageData, topY2, 1, innerX2, outerX2, imgWidth, imgHeight);
        bottomY2 = this._contractRowBounds(consistencyData.bottomY2, imageData, bottomY2, -1, innerX2, outerX2, imgWidth, imgHeight);

        // --- Stage 5: Define Final Crop Regions ---
        const region1W = innerX1 - outerX1 + 1;
        const region2W = outerX2 - innerX2 + 1;
        const region1H = bottomY1 - topY1 + 1;
        const region2H = bottomY2 - topY2 + 1;

        console.log(`Split single image:
    Gap size: ${gapSize},
    Border size:
        left: ${outerX1}, right: ${imgWidth - (outerX2 + 1)},
        top: ${Math.min(topY1, topY2)}, bottom: ${imgHeight - (Math.max(bottomY1, bottomY2) + 1)},
    Img1(x:${outerX1}, y:${topY1}, w:${region1W}, h:${region1H}),
    Img2(x:${innerX2}, y:${topY2}, w:${region2W}, h:${region2H})`);
        return {
            region1: { x: outerX1, y: topY1, width: region1W, height: region1H },
            region2: { x: innerX2, y: topY2, width: region2W, height: region2H }
        };
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
            if (SIC.DEBUG && renderScale === 1) {
                console.log(`Rendering image with:
    gap: ${renderGap}, border: ${borderSpace},
    left image: ${SIC.images[0].width}, ${SIC.images[0].height},
    right image: ${SIC.images[1].width}, ${SIC.images[1].height}`);
            }
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
