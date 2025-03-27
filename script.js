// global variables
var images = [];
var scale;

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
    const saveButton = document.getElementById('save');
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
    const DEFAULT_JPG_QUALITY_VISIBILITY = 'block';
    // Delay resetting controls in case of "duplicate tab"
    // Otherwise slider values and slider text don't match up
    setTimeout(resetControlsToDefaults, 100);

    // State variables
    let imageNames = [];
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
        maxScale = 1;
        setScale(DEFAULT_SCALE / 100);
        
        // Reset gap
        gapPercent = DEFAULT_GAP_PERCENT;
        gapSlider.value = DEFAULT_GAP_PERCENT * 10;
        gapValue.textContent = `${DEFAULT_GAP_PERCENT}%`;
        
        // Reset color
        bgColor = DEFAULT_COLOR;
        colorPicker.value = DEFAULT_COLOR;

        // Reset format and jpg quality
        qualitySlider.value = DEFAULT_JPG_QUALITY;
        qualityValue.textContent = `${DEFAULT_JPG_QUALITY}%`;
        formatSelect.value = DEFAULT_FORMAT;
        qualityContainer.style.display = DEFAULT_JPG_QUALITY_VISIBILITY;
    }

    // Control event listeners
    scaleSlider.addEventListener('input', updateScale);
    gapSlider.addEventListener('input', updateGap);
    colorPicker.addEventListener('input', updateColor);
    swapButton.addEventListener('click', updateSwap);

    // Show/hide quality slider based on format selection
    formatSelect.addEventListener('change', function() {
        if (this.value === 'image/jpeg') {
            qualityContainer.style.display = 'block';
        } else {
            qualityContainer.style.display = 'none';
        }
    });
    
    // Update quality value display
    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = `${this.value}%`;
    });

    saveButton.addEventListener('click', saveImage);

    // Window resize handler
    window.addEventListener('resize', onResize);

    function onResize() {
        if (images.length === 2) {
            const optimalScale = calculateOptimalScale(images[0], images[1]);
            setScale(optimalScale);
            if (window.cropModule.isCropping()) {
                window.cropModule.onScaleChange(scale);
            } else {
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
                        setScale(optimalScale);

                        // draw the images
                        drawImages();
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Calculate the optimal scale
    function calculateOptimalScale(img1, img2) {
        // Check if we're in vertical/mobile layout by checking the computed style
        const mainContainer = document.getElementById('main-container');
        const isVerticalLayout = window.getComputedStyle(mainContainer).flexDirection === 'column';
        
        // Get the available viewport width (accounting for some margin)
        // In vertical layout, we don't need to subtract the left panel width
        const leftPanelWidth = document.fullscreenElement ? 0 : document.getElementById('left-panel').offsetWidth;
        const viewportWidth = isVerticalLayout 
            ? window.innerWidth - 15
            : window.innerWidth - leftPanelWidth - 50;

        // Calculate total width at 100% scale (using the current pixel gap)
        const gapWidthAt100 = pixelGap(img1, img2);
        const totalWidthAt100 = img1.width + img2.width + gapWidthAt100;

        // Calculate larger height of the two images
        const imageHeight = Math.max(img1.height, img2.height);

        // Calculate max height, leave room for crop handles at screen edge
        const maxHeight = screen.height * (window.cropModule.isCropping() ? 0.98 : 1);

        // Calculate the scale percentage needed to fit
        maxScale = viewportWidth / totalWidthAt100;
        maxScale = Math.min(maxHeight / imageHeight, maxScale);
        return maxScale;
    }

    function updateScale() {
        // Update to new scale
        const newScale = Math.min(maxScale, parseInt(this.value) / 100);
        setScale(newScale);

        if (window.cropModule.isCropping()) {
            window.cropModule.onScaleChange(newScale);
        } else {
            // Only redraw images if not in crop mode (crop module handles redrawing in crop mode)
            drawImages();
        }
    }

    function setScale(newScale) {
        scale = newScale;
        const displayScale = Math.round(newScale * 100);
        scaleSlider.max = Math.max(1, Math.max(100, Math.round(maxScale * 100)));
        scaleSlider.value = displayScale;
        scaleValue.textContent = `${displayScale}%`;
    }

    function updateGap() {
        const oldPixelGap = pixelGap(images[0], images[1]);

        // Convert slider value (0-200) to percentage (0-20)
        const sliderValue = parseInt(this.value);
        gapPercent = sliderValue / 10;

        // Update gap value display with percentage
        gapValue.textContent = `${gapPercent.toFixed(1)}%`;

        // redraw
        if (window.cropModule.isCropping()) {
            const newPixelGap = pixelGap(images[0], images[1]);
            window.cropModule.onGapChange(oldPixelGap, newPixelGap);
        } else {
            // Only redraw images if not in crop mode (crop module handles redrawing in crop mode)
            drawImages();
        }
    }

    function pixelGap(img1, img2) {
        if (img1 === undefined || img2 === undefined) return 0;

        const avgWidth = (img1.width + img2.width) / 2;
        return Math.round(avgWidth * (gapPercent / 100));
    }

    function updateColor() {
        bgColor = this.value;
        drawImages();
    }

    function updateSwap() {
        if (images.length !== 2) {
            alert('Please add two images before swapping.');
        } else {
            [images[0], images[1]] = [images[1], images[0]];
            [imageNames[0], imageNames[1]] = [imageNames[1], imageNames[0]];
            updateImageNames();
            window.cropModule.onSwap();
        }
    }

    function updateImageNames() {
        leftImageName.textContent = imageNames[0] || '';
        rightImageName.textContent = imageNames[1] || '';
    }

    /**
     * Creates a combined image with the current settings
     * @param {Object} options - Options for rendering the combined image
     * @param {HTMLCanvasElement} options.targetCanvas - The canvas to draw on
     * @param {boolean} options.forSaving - Whether this is for saving (100% scale) or display
     * @returns {Object} - Parameters used for the rendering (dimensions, etc.)
     */
    function renderCombinedImage(options = {}) {
        if (images.length !== 2) return null;
        
        const { targetCanvas, forSaving = false } = options;
        const targetCtx = targetCanvas.getContext('2d');
        
        // Use display scale or 100% for saving
        const renderScale = forSaving ? 1 : scale;
        
        // Calculate gap - either scaled for display or full size for saving
        let renderGap = pixelGap(images[0], images[1]) * renderScale;
        
        // Calculate dimensions
        const img1Width = images[0].width * renderScale;
        const img2Width = images[1].width * renderScale;
        const totalWidth = img1Width + img2Width + renderGap;
        
        const img1Height = images[0].height * renderScale;
        const img2Height = images[1].height * renderScale;
        const maxHeight = Math.max(img1Height, img2Height);

        // Set canvas dimensions
        targetCanvas.width = totalWidth;
        targetCanvas.height = maxHeight;

        // Clear the canvas
        targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        
        // Fill background with selected color (ONLY the gap)
        targetCtx.fillStyle = bgColor;
        targetCtx.fillRect(
            img1Width,                 // X position (after first image)
            0,                         // Y position (top)
            renderGap,                 // Width (just the gap)
            maxHeight                  // Height (full height)
        );
        
        // Draw the first image
        targetCtx.drawImage(
            images[0],
            0, 0,                                   // Source position
            images[0].width, images[0].height,      // Source dimensions
            0, 0,                                   // Destination position
            img1Width, img1Height                   // Destination dimensions
        );
        
        // Draw the second image
        targetCtx.drawImage(
            images[1],
            0, 0,                                   // Source position
            images[1].width, images[1].height,      // Source dimensions
            img1Width + renderGap, 0,               // Destination position (after first image + gap)
            img2Width, img2Height                   // Destination dimensions
        );
        
        // Store the last render parameters for reference by crop module
        lastRenderParams = {
            totalWidth,
            maxHeight,
            img1Width,
            img2Width,
            renderGap
        };
        
        // Return parameters used for rendering (useful for saving)
        return lastRenderParams;
    }

    function drawImages() {
        // console.trace("Call stack:");
        return renderCombinedImage({
            targetCanvas: canvas,
            forSaving: false
        });
    }

    function saveImage() {
        if (images.length !== 2) {
            alert('Please add two images before saving.');
            return;
        }

        const saveCanvas = document.createElement('canvas');
        
        // Render at 100% scale for saving
        renderCombinedImage({
            targetCanvas: saveCanvas,
            forSaving: true
        });

        const link = document.createElement('a');
        const defaultName = imageNames[0].split('.').slice(0, -1).join('.') || 'combined_image';

        // Get selected format and set appropriate extension
        const format = formatSelect.value;
        const extension = format === 'image/jpeg' ? 'jpg' : 'png';
        link.download = `${defaultName}_combined.${extension}`;

        // For JPEG, use quality parameter; for PNG, don't specify quality
        if (format === 'image/jpeg') {
            const quality = parseInt(qualitySlider.value) / 100;
            link.href = saveCanvas.toDataURL(format, quality);
        } else {
            link.href = saveCanvas.toDataURL(format);
        }

        link.click();
    }

    // Expose necessary variables and functions to the window object for crop.js
    window.drawImages = drawImages;
    window.setScale = setScale;
    window.calculateOptimalScale = calculateOptimalScale;
    window.updateSwap = updateSwap;
    window.onResize = onResize;
});