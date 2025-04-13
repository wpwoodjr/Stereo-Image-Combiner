// global variables
var images = [];
var scale;
var saveButton;

// main script 
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const dropzoneMessage = document.getElementById('dropzoneMessage');
    const canvas = document.getElementById('canvas');
    const canvasContainer = document.getElementById('canvasContainer');
    const scaleSlider = document.getElementById('scale');
    const scaleValue = document.getElementById('scaleValue');
    const gapSlider = document.getElementById('gap');
    const gapValue = document.getElementById('gapValue');
    const colorPicker = document.getElementById('color');
    saveButton = document.getElementById('save');
    const swapButton = document.getElementById('swap');
    // const resetButton = document.getElementById('reset');
    const leftImageName = document.getElementById('leftImageName');
    const rightImageName = document.getElementById('rightImageName');
    const fileInput = document.getElementById('fileInput');
    const formatSelect = document.getElementById('format');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const qualityContainer = document.getElementById('qualityContainer');

    // Default values
    const DEFAULT_SCALE = 50;
    const DEFAULT_GAP_PERCENT = 7.5; // Gap as percentage (7.5%)
    const DEFAULT_COLOR = '#000000';
    const DEFAULT_FORMAT = 'image/jpeg';
    const DEFAULT_JPG_QUALITY = 90;
    // Delay resetting controls in case of "duplicate tab"
    // Otherwise slider values and slider text don't match up
    setTimeout(resetControlsToDefaults, 100);

    // State variables
    let imageNames = [];
    let gapColor = DEFAULT_COLOR;
    let gapPercent = DEFAULT_GAP_PERCENT;
    let maxScale = 1;

    // dropzone message
    let dropzoneMessageText = "Drag and drop two images here or click to browse"
    if (window.matchMedia('(pointer: fine)').matches) {
        dropzoneMessageText += "<br><small>(Hold Ctrl or ⌘ while clicking to select both images)</small>";
    }
    dropzoneMessage.innerHTML = dropzoneMessageText;

    // =========================
    // Event Listeners
    // =========================

    // Make the entire dropzone clickable
    dropzone.addEventListener('click', (e) => {
        // Prevent click from triggering on child elements
        if (e.target === dropzone || e.target === dropzoneMessage) {
            fileInput.click();
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.backgroundColor = '#303030';
        // Update the dropzone message
        dropzoneMessage.textContent = 'Drop images here';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.backgroundColor = '#202020';
        // Update the dropzone message
        dropzoneMessage.innerHTML = dropzoneMessageText;
    });

    dropzone.addEventListener('drop', (e) => {
        dropzoneMessage.innerHTML = dropzoneMessageText;
        e.preventDefault();
        dropzone.style.backgroundColor = '#202020';
        const files = e.dataTransfer.files;
        processFiles(files);
    });

    // File browser input handler
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        // Add this check to prevent processing when no files are selected (cancel case)
        if (files.length > 0) {
            processFiles(files);
            fileInput.value = '';
        }
    });

    // Make the canvas container also accept drag and drop to replace images
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
        const files = e.dataTransfer.files;
        processFiles(files);
    });

    // Make the canvas container clickable
    canvasContainer.addEventListener('click', (e) => {
        if (window.cropModule.isCropping()) {
            return;
        }
        // Prevent click from triggering on child elements
        if (e.target === canvas || e.target === canvasContainer) {
            fileInput.click();
        }
    });

/*
    // Allow resetting to drop more images and restore default settings
    resetButton.addEventListener('click', () => {
        // Reset images
        images = [];
        imageNames = [];
        leftImageName.textContent = '';
        rightImageName.textContent = '';
        window.cropModule.resetCrop();
        
        // Reset UI display
        canvasContainer.style.display = 'none';
        dropzone.style.display = 'flex';

        // Reset control values to defaults
        resetControlsToDefaults();
    });
*/

    function resetControlsToDefaults() {
        // Reset scale
        setScale(DEFAULT_SCALE / 100, 1);
        
        // Reset gap
        gapPercent = getLocalStorageItem('gapPercent', DEFAULT_GAP_PERCENT);
        gapSlider.value = gapPercent * 10;
        gapValue.textContent = `${gapPercent}%`;
        
        // Reset color
        gapColor = getLocalStorageItem('gapColor', DEFAULT_COLOR);
        colorPicker.value = gapColor;

        // Reset format and jpg quality
        qualitySlider.value = getLocalStorageItem('jpgQuality', DEFAULT_JPG_QUALITY);
        qualityValue.textContent = `${qualitySlider.value}%`;
        formatSelect.value = getLocalStorageItem('fileFormat', DEFAULT_FORMAT);
        qualityContainer.style.display = formatSelect.value === 'image/jpeg' ? 'block' : 'none';
    }

    // Control event listeners
    scaleSlider.addEventListener('input', updateScale);
    gapSlider.addEventListener('input', updateGap);
    colorPicker.addEventListener('input', updateColor);
    swapButton.addEventListener('click', updateSwap);
    swapButton.disabled = true;

    // Show/hide quality slider based on format selection
    formatSelect.addEventListener('change', function() {
        qualityContainer.style.display = this.value === 'image/jpeg' ? 'block' : 'none';
        setLocalStorageItem('fileFormat', this.value);
    });
    
    // Update quality value display
    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = `${this.value}%`;
        setLocalStorageItem('jpgQuality', this.value);
    });

    saveButton.addEventListener('click', saveImage);
    saveButton.disabled = true;

    // Window resize handler
    window.addEventListener('resize', onResize);

    function onResize(e, msg = "resize event") {
        if (images.length === 2) {
            // console.log("onResize:", msg);
            const optimalScale = calculateOptimalScale(images[0], images[1]);
            setScale(optimalScale, optimalScale);

            // alert crop interface that user changed the window size
            window.cropModule.onScaleChange();
            if (! window.cropModule.isCropping()) {
                // Only redraw images if not in crop mode (crop module handles redrawing in crop mode)
                drawImages();
            }
        }
    }

    // =========================
    // Functions
    // =========================

    // Process the selected files
    function processFiles(files) {
        if (files.length != 2) {
            alert('Please select two images.');
            return;
        }

        newImages = [];
        newImageNames = [];
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
                        images = [];
                        window.cropModule.resetCrop();
                        images = newImages;
                        imageNames = newImageNames;

                        // Show the canvas and hide dropzone when both images are loaded
                        canvasContainer.style.display = 'block';
                        dropzone.style.display = 'none';
                        updateImageNames();

                        // Calculate and set optimal scale
                        const optimalScale = calculateOptimalScale(images[0], images[1]);
                        setScale(optimalScale, optimalScale);

                        // draw the images
                        drawImages();

                        // enable buttons
                        saveButton.disabled = false;
                        swapButton.disabled = false;
                        window.cropModule.cropButton.disabled = false;
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function getViewPortWidth() {
        // Check if we're in vertical/mobile layout by checking the computed style
        const mainContainer = document.getElementById('main-container');
        const isVerticalLayout = window.getComputedStyle(mainContainer).flexDirection === 'column';
        
        // Get the available viewport width (accounting for some margin)
        // In vertical layout, we don't need to subtract the left panel width
        const leftPanelWidth = document.fullscreenElement ? 0 : document.getElementById('left-panel').offsetWidth;
        const viewportWidth = isVerticalLayout 
            ? window.innerWidth - 15
            : window.innerWidth - leftPanelWidth - 50;
        return viewportWidth;
    }

    // Calculate the optimal scale
    function calculateOptimalScale(img1, img2) {
        // get image area
        const viewportWidth = getViewPortWidth();

        // Calculate total width at 100% scale (using the current pixel gap)
        const gapWidthAt100 = pixelGap(img1, img2);
        const totalWidthAt100 = img1.width + img2.width + gapWidthAt100;

        // Calculate larger height of the two images
        const imageHeight = Math.max(img1.height, img2.height);

        // Calculate max height
        const maxHeight = screen.height;

        // Calculate the scale percentage needed to fit
        const optimalScale = viewportWidth / totalWidthAt100;
        return Math.min(maxHeight / imageHeight, optimalScale);
    }

    function updateScale() {
        // Update to new scale
        const newScale = parseInt(this.value) / 100;
        setScale(newScale, maxScale);

        if (window.cropModule.isCropping()) {
            window.cropModule.onScaleChange();
        } else {
            // Only redraw images if not in crop mode (crop module handles redrawing in crop mode)
            drawImages();
        }
    }

    function setScale(newScale, newMaxScale) {
        scale = Math.min(newScale, newMaxScale);
        maxScale = newMaxScale;
        scaleSlider.max = Math.max(1, Math.round(maxScale * 100));
        const displayScale = Math.round(scale * 100);
        scaleSlider.value = displayScale;
        scaleValue.textContent = `${displayScale}%`;
    }

    function updateGap() {
        // Convert slider value (0-200) to percentage (0-20)
        const sliderValue = parseInt(this.value);
        gapPercent = sliderValue / 10;
        setLocalStorageItem('gapPercent', gapPercent);

        // Update gap value display with percentage
        gapValue.textContent = `${gapPercent.toFixed(1)}%`;

        if (images.length !== 2) return;

        // check if max scale needs to be reduced because of new gap
        const optimalScale = calculateOptimalScale(images[0], images[1]);
        if (optimalScale < scale) {
            // redraw at smaller scale with new gap
            setScale(optimalScale, optimalScale);
            if (window.cropModule.isCropping()) {
                window.cropModule.onScaleChange();
            } else {
                drawImages();
            }
        } else {
            // just set new max scale and redraw with new gap
            setScale(scale, optimalScale);
            if (window.cropModule.isCropping()) {
                window.cropModule.drawCropInterface();
            } else {
                drawImages();
            }
        }
    }

    function pixelGap(img1, img2) {
        const avgWidth = (img1.width + img2.width) / 2;
        return avgWidth * (gapPercent / 100);
        // return Math.round(avgWidth * (gapPercent / 100));
    }

    function updateColor() {
        gapColor = this.value;
        setLocalStorageItem('gapColor', this.value);
        if (window.cropModule.isCropping()) {
            window.cropModule.drawCropInterface();
        } else {
            drawImages();
        }
    }

    function updateSwap() {
        [images[0], images[1]] = [images[1], images[0]];
        [imageNames[0], imageNames[1]] = [imageNames[1], imageNames[0]];
        updateImageNames();
        window.cropModule.onSwap();
    }

    function updateImageNames() {
        leftImageName.textContent = imageNames[0] || '';
        rightImageName.textContent = imageNames[1] || '';
    }

    /**
     * Creates a combined image with the current settings
     * @param {Object} options - Options for rendering the combined image
     * @param {HTMLCanvasElement} options.targetCanvas - The canvas to draw on
     * @param {Number} options.renderScale - Scale to render at
     * @param {Object} options.xOffsets - Optional X offsets for each image {left: number, right: number}
     * @param {Object} options.yOffsets - Optional Y offsets for each image {left: number, right: number}
     * @param {Number} options.avgWidth - Average width of images for calculating renderGap
     * @returns {Object} - Parameters used for the rendering (dimensions, etc.)
     */
    function renderCombinedImage(options = {}) {
        if (images.length !== 2) return null;
        
        const { 
            targetCanvas, 
            renderScale = 1, 
            xOffsets = {left: 0, right: 0},
            yOffsets = {left: 0, right: 0},
            avgWidth = -1
        } = options;

        const targetCtx = targetCanvas.getContext('2d');
        
        // Calculate gap - either scaled for display or full size for saving
        let renderGap;
        if (avgWidth === -1) {
            renderGap = pixelGap(images[0], images[1]) * renderScale;
        } else {
            renderGap = avgWidth * (gapPercent / 100);
            // renderGap = Math.round(avgWidth * (gapPercent / 100));
        }
        
        // Calculate dimensions
        const img1Width = images[0].width * renderScale;
        const img2Width = images[1].width * renderScale;
        const totalWidth = img1Width + img2Width + renderGap;
        
        const img1Height = images[0].height * renderScale;
        const img2Height = images[1].height * renderScale;
        const maxHeight = Math.max(img1Height + yOffsets.left, img2Height + yOffsets.right);

        // Set canvas dimensions
        targetCanvas.width = totalWidth;
        targetCanvas.height = maxHeight;

        // Clear the canvas
        targetCtx.clearRect(0, 0, totalWidth, maxHeight);

        // Fill background with selected color (ONLY the gap)
        const gapStart = Math.max(yOffsets.left, yOffsets.right);
        const gapHeight = Math.min(img1Height + yOffsets.left, img2Height + yOffsets.right) - gapStart;
        targetCtx.fillStyle = gapColor;
        targetCtx.fillRect(
            img1Width,                  // X position (after first image)
            gapStart,                   // Y position (top)
            renderGap,                  // Width (just the gap)
            gapHeight                   // Height (full height)
        );

        // Draw the left image with offsets
        targetCtx.drawImage(
            images[0],
            0, 0,                                                               // Source position
            images[0].width - xOffsets.left / renderScale, images[0].height,    // Source dimensions
            xOffsets.left, yOffsets.left,                                       // Destination position with offsets
            img1Width - xOffsets.left, img1Height                               // Destination dimensions
        );

        // Right image
        const xFactor = xOffsets.right / renderScale;
        targetCtx.drawImage(
            images[1],
            -xFactor, 0,                                    // Source position
            images[1].width + xFactor, images[1].height,    // Source dimensions
            img1Width + renderGap, yOffsets.right,          // Destination position with offset
            img2Width + xOffsets.right, img2Height          // Destination dimensions
        );

        // Store the last render parameters for reference by crop module
        lastRenderParams = {
            img1Width,
            img2Width,
            renderGap
        };
        
        // Return parameters used for rendering (useful for saving)
        return lastRenderParams;
    }

    function drawImages(options = {}) {
        const { xOffsets = {left: 0, right: 0}, yOffsets = {left: 0, right: 0}, avgWidth = -1 } = options;
        
        return renderCombinedImage({
            targetCanvas: canvas,
            renderScale: scale,
            xOffsets,
            yOffsets,
            avgWidth
        });
    }

    function saveImage() {
        const saveCanvas = document.createElement('canvas');
        
        // Render at 100% scale for saving
        renderCombinedImage({
            targetCanvas: saveCanvas,
            renderScale: 1
        });

        const link = document.createElement('a');
        const fileName = createCombinedFilename();

        // Get selected format and set appropriate extension
        const format = formatSelect.value;
        const extension = format === 'image/jpeg' ? 'jpg' : 'png';
        link.download = `${fileName}.${extension}`;

        // For JPEG, use quality parameter; for PNG, don't specify quality
        if (format === 'image/jpeg') {
            const quality = parseInt(qualitySlider.value) / 100;
            link.href = saveCanvas.toDataURL(format, quality);
        } else {
            link.href = saveCanvas.toDataURL(format);
        }

        link.click();
    }

    function createCombinedFilename() {
        // Extract base names - handle files without extensions
        const baseName1 = imageNames[0].includes('.') ? 
            imageNames[0].split('.').slice(0, -1).join('.') : 
            imageNames[0];
        
        const baseName2 = imageNames[1].includes('.') ? 
            imageNames[1].split('.').slice(0, -1).join('.') : 
            imageNames[1];
        
        if (!baseName1) return 'combined_image';
        
        // Find common prefix up to the last separator
        const commonPrefix = findCommonPrefixLastSeparator(baseName1, baseName2);
        
        // If we have no common prefix, create a combined name with both full names
        if (!commonPrefix) {
            return `${baseName1} & ${baseName2}`;
        }
        
        // Extract the parts after the last separator
        const suffix1 = baseName1.substring(commonPrefix.length).trim();
        const suffix2 = baseName2.substring(commonPrefix.length).trim();
        
        // Remove any leading separators (_, -, etc) from suffixes
        const cleanSuffix1 = suffix1.replace(/^[-_\s]+/, '');
        const cleanSuffix2 = suffix2.replace(/^[-_\s]+/, '');
        
        // Create the combined name
        const cleanPrefix = commonPrefix.replace(/[-_\s]+$/, ''); // Remove trailing separators
        
        return cleanSuffix2 ? `${cleanPrefix} - ${cleanSuffix1} & ${cleanSuffix2}` : baseName1;
    }
    
    // Find common prefix up to the last separator
    function findCommonPrefixLastSeparator(str1, str2) {
        // Check if the first character is different - truly no common prefix
        if (str1.charAt(0) !== str2.charAt(0)) {
            return '';
        }
        
        // Find all separator positions in both strings
        const separators = ['_', '-', ' '];
        
        // Find all separator positions in first string
        const positions1 = [];
        separators.forEach(sep => {
            let pos = -1;
            while ((pos = str1.indexOf(sep, pos + 1)) !== -1) {
                positions1.push(pos);
            }
        });
        
        // Sort positions in ascending order
        positions1.sort((a, b) => a - b);
        
        // Find the common part
        let commonLength = 0;
        for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
            if (str1.charAt(i) !== str2.charAt(i)) {
                break;
            }
            commonLength = i + 1;
        }
        
        // If hardly anything in common, consider it no common prefix
        if (commonLength <= 1) return '';
        
        // Find the last separator position before the divergence point
        let lastSepPos = -1;
        for (const pos of positions1) {
            if (pos < commonLength) {
                lastSepPos = pos;
            } else {
                break;
            }
        }
        
        // If we found a separator, use it as the split point (include the separator)
        if (lastSepPos !== -1) {
            return str1.substring(0, lastSepPos + 1);
        }
        
        // If no separator was found, return the common prefix
        return str1.substring(0, commonLength);
    }
    
    function getLocalStorageItem(item, defaultVal) {
        try {
            let value = localStorage.getItem(item);
            // console.log(item, value, typeof value, defaultVal, typeof defaultVal);
            if (value === null) {
                return defaultVal;
            } else if (typeof defaultVal === "number" ) {
                value = parseFloat(value);
                if (isFinite(value)) {
                    return value;
                } else {
                    return defaultVal;
                }
            } else if (typeof defaultVal === "boolean" ) {
                return value === "true" ? true : false;
            } else {
                return value;
            }
        }
        catch(e) {
            return defaultVal;
        }
    }

    function setLocalStorageItem(item, value) {
        try {
            // console.log(item, value);
            localStorage.setItem(item, value);
        }
        catch(e) {
        }
    }
    
    // Expose necessary variables and functions to the window object for crop.js
    window.drawImages = drawImages;
    window.setScale = setScale;
    window.calculateOptimalScale = calculateOptimalScale;
    window.updateSwap = updateSwap;
    window.onResize = onResize;
    window.getViewPortWidth = getViewPortWidth;
    window.getLocalStorageItem = getLocalStorageItem;
    window.setLocalStorageItem = setLocalStorageItem;
});