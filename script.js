// global variables
var images = [];
var scale;
var saveButton;
var maxScale;
var isCropped;

// main script 
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const BODY_BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--body-bg-color').trim();
    const dropzone = document.getElementById('dropzone');
    const dropzoneMessage = document.getElementById('dropzoneMessage');
    const canvas = document.getElementById('canvas');
    const canvasContainer = document.getElementById('canvasContainer');
    const scaleSlider = document.getElementById('scale');
    const scaleValue = document.getElementById('scaleValue');
    const gapSlider = document.getElementById('gap');
    const gapValue = document.getElementById('gapValue');
    const colorPicker = document.getElementById('color');
    const bordersCheckbox = document.getElementById('borders');
    const transparentCheckbox = document.getElementById('transparent');
    const cornerRadiusSlider = document.getElementById('cornerRadius');
    const cornerRadiusValue = document.getElementById('cornerRadiusValue');
    saveButton = document.getElementById('save');
    const swapButton = document.getElementById('swap');
    // const resetButton = document.getElementById('reset');
    const leftImageName = document.getElementById('leftImageName');
    const rightImageName = document.getElementById('rightImageName');
    const fileInput = document.getElementById('fileInput');
    const filenamePrefixInput = document.getElementById('filenamePrefix');
    const formatSelect = document.getElementById('format');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const qualityContainer = document.getElementById('qualityContainer');

    // Default values
    const DEFAULT_SCALE = 100;
    const DEFAULT_GAP_PERCENT = 3.0; // Gap as percentage
    const DEFAULT_COLOR = '#000000';
    const DEFAULT_BORDERS = true;
    const GAP_TO_BORDER_RATIO = 1;
    const DEFAULT_TRANSPARENT = false;
    const DEFAULT_CORNER_RADIUS = 0;
    const DEFAULT_FORMAT = 'image/jpeg';
    const DEFAULT_JPG_QUALITY = 90;
    // Delay resetting controls in case of "duplicate tab"
    // Otherwise slider values and slider text don't match up
    setTimeout(resetControlsToDefaults, 100);

    // State variables
    let imageNames = [];
    let gapPercent = DEFAULT_GAP_PERCENT;
    let gapColor = DEFAULT_COLOR;
    let hasBorders = DEFAULT_BORDERS;
    let isTransparent = DEFAULT_TRANSPARENT;
    let cornerRadiusPercent = DEFAULT_CORNER_RADIUS;

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
        const uncroppedScalePercent = getLocalStorageItem('uncroppedScalePercent', DEFAULT_SCALE);
        setScalePercent(uncroppedScalePercent, 1);
        isCropped = false;

        // Reset gap
        gapPercent = getLocalStorageItem('gapPercent', DEFAULT_GAP_PERCENT);
        gapSlider.value = gapPercent * 10;
        gapValue.textContent = `${gapPercent.toFixed(1)}%`;
        
        // Reset color
        gapColor = getLocalStorageItem('gapColor', DEFAULT_COLOR);
        colorPicker.value = gapColor;
        hasBorders = getLocalStorageItem('hasBorders', DEFAULT_BORDERS);
        bordersCheckbox.checked = hasBorders;
        isTransparent = getLocalStorageItem('isTransparent', DEFAULT_TRANSPARENT);
        transparentCheckbox.checked = isTransparent;
        updateColorPickerState();

        // Reset corner radius
        cornerRadiusPercent = getLocalStorageItem('cornerRadiusPercent', DEFAULT_CORNER_RADIUS);
        cornerRadiusSlider.value = cornerRadiusPercent;
        cornerRadiusValue.textContent = `${cornerRadiusPercent}%`;

        // Reset format and jpg quality
        filenamePrefixInput.value = getLocalStorageItem('filenamePrefix', '');
        qualitySlider.value = getLocalStorageItem('jpgQuality', DEFAULT_JPG_QUALITY);
        qualityValue.textContent = `${qualitySlider.value}%`;
        formatSelect.value = getLocalStorageItem('fileFormat', DEFAULT_FORMAT);
        qualityContainer.style.display = formatSelect.value === 'image/jpeg' ? 'block' : 'none';
    }

    // Control event listeners
    scaleSlider.addEventListener('input', updateScale);
    gapSlider.addEventListener('input', updateGap);
    colorPicker.addEventListener('input', updateColor);
    bordersCheckbox.addEventListener('input', updateBorders);
    transparentCheckbox.addEventListener('input', updateTransparent);
    cornerRadiusSlider.addEventListener('input', updateCornerRadius);
    swapButton.addEventListener('click', updateSwap);
    swapButton.disabled = true;

    filenamePrefixInput.addEventListener('input', function() {
        setLocalStorageItem('filenamePrefix', this.value);
    });

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
            if (window.cropModule.isCropping()) {
                // alert crop interface that user changed the window size
                window.cropModule.onScaleChange(0);
            } else {
                const optimalScale = calculateMaxScale(images[0], images[1]);
                setScalePercent(scale / maxScale, optimalScale);
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
                        const optimalScale = calculateMaxScale(images[0], images[1]);
                        setScalePercent(scale / maxScale, optimalScale);

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
    function calculateMaxScale(img1, img2, overlaid = false, borders = true) {
        // get image area
        const viewportWidth = getViewPortWidth();

        let totalWidthAt100;
        if (!overlaid) {
            // Calculate total width at 100% scale (using the current pixel gap)
            const gapWidthAt100 = Math.round(pixelGap(img1, img2) / GAP_TO_BORDER_RATIO) * GAP_TO_BORDER_RATIO;
            const borderSpace = hasBorders && borders ? gapWidthAt100 / GAP_TO_BORDER_RATIO : 0;
            totalWidthAt100 = img1.width + img2.width + gapWidthAt100 + borderSpace * 2;
        } else {
            // get the max image width
            totalWidthAt100 = Math.max(img1.width, img2.width);
        }

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
        const newScalePercent = parseInt(this.value) / 100;

        if (window.cropModule.isCropping()) {
            window.cropModule.onScaleChange(newScalePercent);
        } else {
            setScalePercent(newScalePercent);
            if (isCropped) {
                setLocalStorageItem('croppedScalePercent', newScalePercent);
            } else {
                setLocalStorageItem('uncroppedScalePercent', newScalePercent);
            }
            // Only redraw images if not in crop mode (crop module handles redrawing in crop mode)
            drawImages();
        }
    }

    function setScalePercent(scalePercent, newMaxScale = maxScale) {
        scale = Math.min(scalePercent * newMaxScale, newMaxScale);
        maxScale = newMaxScale;
        const displayScale = Math.round(scale / maxScale * 100);
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

        if (window.cropModule.isCropping()) {
            // alert crop interface that max scale has changed
            window.cropModule.onScaleChange(0);
        } else {
            const optimalScale = calculateMaxScale(images[0], images[1]);
            setScalePercent(scale / maxScale, optimalScale);
            // Only redraw images if not in crop mode (crop module handles redrawing in crop mode)
            drawImages();
        }
    }

    function pixelGap(img1, img2) {
        const avgWidth = (img1.width + img2.width) / 2;
        return avgWidth * (gapPercent / 100);
    }

    function updateColor() {
        gapColor = this.value;
        setLocalStorageItem('gapColor', gapColor);
        if (window.cropModule.isCropping()) {
            window.cropModule.drawCropInterface();
        } else {
            drawImages();
        }
    }

    function updateBorders() {
        hasBorders = this.checked;
        setLocalStorageItem('hasBorders', hasBorders);

        if (images.length !== 2) return;

        if (window.cropModule.isCropping()) {
            // alert crop interface that max scale has changed
            window.cropModule.onScaleChange(0);
        } else {
            const optimalScale = calculateMaxScale(images[0], images[1]);
            setScalePercent(scale / maxScale, optimalScale);
            // Only redraw images if not in crop mode (crop module handles redrawing in crop mode)
            drawImages();
        }
    }

    function updateTransparent() {
        isTransparent = this.checked;
        setLocalStorageItem('isTransparent', isTransparent);
        updateColorPickerState();
        if (window.cropModule.isCropping()) {
            window.cropModule.drawCropInterface();
        } else {
            drawImages();
        }
    }

    function updateColorPickerState() {
        colorPicker.disabled = isTransparent;
        if (isTransparent) {
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

    function updateCornerRadius() {
        cornerRadiusPercent = parseInt(this.value);
        setLocalStorageItem('cornerRadiusPercent', cornerRadiusPercent);
        cornerRadiusValue.textContent = `${cornerRadiusPercent}%`;
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
     * @param {HTMLCanvasElement} targetCanvas - The canvas to draw on
     * @param {number} renderScale - Scale to render at
     * @param {Object} options - Options for rendering the combined image
     * @param {Object} options.xOffsets - Optional X offsets for each image {left: number, right: number}
     * @param {Object} options.yOffsets - Optional Y offsets for each image {left: number, right: number}
     * @param {number} options.avgWidth - Average width of images for calculating renderGap; -1 or crop box width if cropping
     * @returns {Object} - Parameters used for the rendering (dimensions, etc.)
     */
    function renderCombinedImage(targetCanvas, renderScale, options = {}) {
        if (images.length !== 2) return null;
        
        const {
            xOffsets = {left: 0, right: 0},
            yOffsets = {left: 0, right: 0},
            avgWidth = -1
        } = options;
        const cropping = avgWidth !== -1;

        const targetCtx = targetCanvas.getContext('2d');
        
        // Calculate gap
        let renderGap;
        let borderSpace = 0;
        if (!cropping) {
            // Calculate gap and border spacing, ensure they are integers (assume GAP_TO_BORDER_RATIO is an integer)
            renderGap = Math.round(pixelGap(images[0], images[1]) / GAP_TO_BORDER_RATIO) * GAP_TO_BORDER_RATIO * renderScale;
            if (hasBorders) {
                borderSpace = renderGap / GAP_TO_BORDER_RATIO;
            }
        } else {
            // base gap on crop box width
            renderGap = avgWidth * (gapPercent / 100);
        }

        // Calculate dimensions (without borders)
        const img1Width = images[0].width * renderScale;
        const img2Width = images[1].width * renderScale;
        const rightImgStart = img1Width + renderGap;
        
        // Canvas width grows to accommodate borders
        const totalWidth = rightImgStart + img2Width + (borderSpace * 2); // Add border space on left and right

        const img1Height = images[0].height * renderScale;
        const img2Height = images[1].height * renderScale;
        
        // Canvas height grows to accommodate borders
        const maxImageHeight = Math.max(img1Height + yOffsets.left, img2Height + yOffsets.right);
        const maxHeight = maxImageHeight + (borderSpace * 2); // Add border space top and bottom

        // Set canvas dimensions (both width and height grow for borders)
        targetCanvas.width = totalWidth;
        targetCanvas.height = maxHeight;

        // Handle background fill
        if (!cropping) {
            if (isTransparent) {
                // Clear the canvas
                targetCtx.clearRect(0, 0, totalWidth, maxHeight);
            } else {
                // Fill background with selected color
                targetCtx.fillStyle = gapColor;
                targetCtx.fillRect(0, 0, totalWidth, maxHeight);
            }
        } else {
            // crop mode
            // Fill background with body background color
            targetCtx.fillStyle = BODY_BG_COLOR;
            targetCtx.fillRect(0, 0, totalWidth, maxHeight);

            // Fill background with selected color (ONLY the gap)
            const gapStart = Math.max(yOffsets.left, yOffsets.right);
            const gapHeight = Math.min(img1Height + yOffsets.left, img2Height + yOffsets.right) - gapStart;

            if (isTransparent) {
                // Clear the gap
                targetCtx.clearRect(
                    img1Width + borderSpace,            // X position (after first image + border)
                    gapStart + borderSpace,             // Y position (top + border)
                    renderGap,                          // Width (just the gap)
                    gapHeight                           // Height (full height)
                );
            } else {
                // Fill gap with selected color
                targetCtx.fillStyle = gapColor;
                targetCtx.fillRect(
                    img1Width + borderSpace,            // X position (after first image + border)
                    gapStart + borderSpace,             // Y position (top + border)
                    renderGap,                          // Width (just the gap)
                    gapHeight                           // Height (full height)
                );
            }
        }

        targetCtx.save();
        
        // Handle rounded corners clipping if needed
        if (!cropping && cornerRadiusPercent > 0) {
            // Get radius for corners
            const maxRadius = Math.min(img1Width, img2Width, img1Height, img2Height) / 2;
            const renderCornerRadius = cornerRadiusPercent / 100 * maxRadius;

            // Create a single clipping path for both images
            targetCtx.beginPath();
            
            // Left image clipping region (all corners rounded)
            targetCtx.roundRect(
                xOffsets.left + borderSpace, 
                yOffsets.left + borderSpace,
                img1Width - xOffsets.left, 
                img1Height,
                renderCornerRadius
            );
            
            // Right image clipping region (all corners rounded)
            targetCtx.roundRect(
                rightImgStart + borderSpace, 
                yOffsets.right + borderSpace,
                img2Width + xOffsets.right, 
                img2Height,
                renderCornerRadius
            );
            
            targetCtx.clip();
        }

        // Draw the left image (position offset by border space)
        targetCtx.drawImage(
            images[0],
            0, 0,                                                               // Source position
            images[0].width - xOffsets.left / renderScale, images[0].height,    // Source dimensions
            xOffsets.left + borderSpace, yOffsets.left + borderSpace,           // Destination position with border space
            img1Width - xOffsets.left, img1Height                               // Destination dimensions
        );

        // Draw the right image (position offset by border space)
        const xFactor = xOffsets.right / renderScale;
        targetCtx.drawImage(
            images[1],
            -xFactor, 0,                                                        // Source position
            images[1].width + xFactor, images[1].height,                        // Source dimensions
            rightImgStart + borderSpace, yOffsets.right + borderSpace,          // Destination position with border space
            img2Width + xOffsets.right, img2Height                              // Destination dimensions
        );
        
        targetCtx.restore();

        // Store the last render parameters for reference by crop module
        // Note: these remain the original sizes without border adjustments
        lastRenderParams = {
            img1Width,
            img1Height,
            img2Width,
            img2Height,
            rightImgStart: rightImgStart + borderSpace // Adjust for border space
        };
        
        // Return parameters used for rendering (useful for saving)
        return lastRenderParams;
    }

    function drawImages(options = {}) {
        return renderCombinedImage(canvas, scale, options);
    }

    function saveImage() {
        // Check if trying to save as JPG with transparency
        const format = formatSelect.value;
        if (isTransparent && format === 'image/jpeg') {
            alert('JPG format does not support transparency. Please choose PNG format to preserve the transparent gap, or uncheck the Transparent option.');
            return;
        }

        const saveCanvas = document.createElement('canvas');
        
        // Render at 100% scale for saving
        renderCombinedImage(saveCanvas, 1, {});

        const link = document.createElement('a');
        const fileName = createCombinedFilename();

        // Get selected format and set appropriate extension
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
        // Get the prefix from the input field
        const prefix = filenamePrefixInput.value.trim();
        
        // Extract base names - handle files without extensions
        const baseName1 = imageNames[0].includes('.') ? 
            imageNames[0].split('.').slice(0, -1).join('.') : 
            imageNames[0];
        
        const baseName2 = imageNames[1].includes('.') ? 
            imageNames[1].split('.').slice(0, -1).join('.') : 
            imageNames[1];
        
        if (!baseName1) return prefix ? prefix + ' combined_image' : 'combined_image';
        
        // Find common prefix up to the last separator
        const commonPrefix = findCommonPrefixLastSeparator(baseName1, baseName2);
        
        // If we have no common prefix, create a combined name with both full names
        if (!commonPrefix) {
            return prefix ? `${prefix} ${baseName1} & ${baseName2}` : `${baseName1} & ${baseName2}`;
        }
        
        // Extract the parts after the last separator
        const suffix1 = baseName1.substring(commonPrefix.length).trim();
        const suffix2 = baseName2.substring(commonPrefix.length).trim();
        
        // Remove any leading separators (_, -, etc) from suffixes
        const cleanSuffix1 = suffix1.replace(/^[-_\s]+/, '');
        const cleanSuffix2 = suffix2.replace(/^[-_\s]+/, '');
        
        // Create the combined name
        const cleanPrefix = commonPrefix.replace(/[-_\s]+$/, ''); // Remove trailing separators
        
        // Add user-provided prefix if it exists
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
        // return(defaultVal);
        try {
            let value = localStorage.getItem(item);
            // console.log('getLocalStorageItem:', item, value, typeof value, defaultVal, typeof defaultVal);
            if (value === null) {
                return defaultVal;
            } else if (typeof defaultVal === "number" ) {
                value = parseFloat(value);
                return isFinite(value) ? value : defaultVal;
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
            // console.log('setLocalStorageItem:', item, value);
            localStorage.setItem(item, value);
            return true;
        }
        catch(e) {
            return false;
        }
    }
    
    // Expose necessary variables and functions to the window object for crop.js
    window.drawImages = drawImages;
    window.setScalePercent = setScalePercent;
    window.calculateMaxScale = calculateMaxScale;
    window.updateSwap = updateSwap;
    window.onResize = onResize;
    window.getViewPortWidth = getViewPortWidth;
    window.getLocalStorageItem = getLocalStorageItem;
    window.setLocalStorageItem = setLocalStorageItem;
});