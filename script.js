// global variables
var images = [];
var lastRenderParams = null;
var scale;

// main script
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const dropzoneMessage = document.getElementById('dropzoneMessage');
    const canvas = document.getElementById('canvas');
    const canvasContainer = document.getElementById('canvasContainer');
    const ctx = canvas.getContext('2d');
    const scaleSlider = document.getElementById('scale');
    const scaleValue = document.getElementById('scaleValue');
    const gapSlider = document.getElementById('gap');
    const gapValue = document.getElementById('gapValue');
    const colorPicker = document.getElementById('color');
    const saveButton = document.getElementById('save');
    const swapButton = document.getElementById('swap');
    const resetButton = document.getElementById('reset');
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

    // State variables
    let imageNames = [];
    let gapPercent = DEFAULT_GAP_PERCENT;
    let bgColor = DEFAULT_COLOR;
    scale = DEFAULT_SCALE / 100;
    let pixelGap = 0; // Actual pixel gap calculated from percentage

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
        dropzoneMessage.textContent = 'Drag and drop two images here or click to browse';
    });

    dropzone.addEventListener('drop', (e) => {
        dropzoneMessage.textContent = 'Drag and drop two images here or click to browse';
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
        if (window.cropModule && window.cropModule.isCropping()) {
            return;
        }
        // Prevent click from triggering on child elements
        if (e.target === canvas || e.target === canvasContainer) {
            fileInput.click();
        }
    });

    // Allow resetting to drop more images and restore default settings
    resetButton.addEventListener('click', () => {
        // Reset images
        images = [];
        imageNames = [];
        leftImageName.textContent = '';
        rightImageName.textContent = '';
        if (window.cropModule) window.cropModule.resetCrop();
        
        // Reset UI display
        canvasContainer.style.display = 'none';
        dropzone.style.display = 'flex';

        // Reset control values to defaults
        resetControlsToDefaults();
    });

    // Control event listeners
    scaleSlider.addEventListener('input', updateScale);
    gapSlider.addEventListener('input', updateGap);
    colorPicker.addEventListener('input', updateColor);

    swapButton.addEventListener('click', () => {
        if (images.length === 2) {
            [images[0], images[1]] = [images[1], images[0]];
            [imageNames[0], imageNames[1]] = [imageNames[1], imageNames[0]];
            updateImageNames();
            drawImages();
        }
    });

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
    window.addEventListener('resize', function() {
        if (images.length === 2) {
            const optimalScale = calculateOptimalScale(images[0], images[1]);
            setScale(optimalScale / 100);
            if (window.cropModule.isCropping()) {
                window.cropModule.onScaleChange(scale);
            } else {
                // Only redraw images if not in crop mode (crop module handles redrawing in crop mode)
                drawImages();
            }
        }
    });

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
                        if (window.cropModule) window.cropModule.resetCrop();
                        images = newImages;
                        imageNames = newImageNames;

                        // Show the canvas and hide dropzone when both images are loaded
                        canvasContainer.style.display = 'block';
                        dropzone.style.display = 'none';
                        updateImageNames();

                        // Calculate and set optimal scale
                        calculatePixelGap(); // Calculate pixel gap based on images
                        const optimalScale = calculateOptimalScale(images[0], images[1]);
                        setScale(optimalScale / 100);

                        // draw the images
                        drawImages();
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Calculate pixel gap based on percentage of average image width
    function calculatePixelGap() {
        if (images.length !== 2) return 0;
        
        const avgWidth = (images[0].width + images[1].width) / 2;
        pixelGap = Math.round(avgWidth * (gapPercent / 100));
        
        // Update slider based on percentage (scaled to 0-200 range)
        gapSlider.value = gapPercent * 10;
        
        return pixelGap;
    }

    // Calculate the optimal scale
    function calculateOptimalScale(img1, img2) {
        // Check if we're in vertical/mobile layout by checking the computed style
        const mainContainer = document.getElementById('main-container');
        const isVerticalLayout = window.getComputedStyle(mainContainer).flexDirection === 'column';
        
        // Get the available viewport width (accounting for some margin)
        // In vertical layout, we don't need to subtract the left panel width
        const leftPanelWidth = document.getElementById('left-panel').offsetWidth;
        const viewportWidth = isVerticalLayout 
            ? window.innerWidth - 15
            : window.innerWidth - leftPanelWidth - 50;
        
        // Calculate total width at 100% scale (using the current pixel gap)
        const totalWidthAt100 = img1.width + img2.width + pixelGap;
        
        // Calculate the scale percentage needed to fit
        let optimalScale = (viewportWidth / totalWidthAt100) * 100;
        
        // Cap the scale between the min and max values of the slider
        optimalScale = Math.min(Math.max(optimalScale, 1), 100);
        
        return Math.floor(optimalScale); // Round down to nearest integer
    }

    function resetControlsToDefaults() {
        // Reset scale
        setScale(DEFAULT_SCALE / 100);
        
        // Reset gap
        gapPercent = DEFAULT_GAP_PERCENT;
        gapSlider.value = DEFAULT_GAP_PERCENT * 10;
        gapValue.textContent = `${DEFAULT_GAP_PERCENT}%`;
        pixelGap = 0;
        
        // Reset color
        bgColor = DEFAULT_COLOR;
        colorPicker.value = DEFAULT_COLOR;
    }

    function updateScale() {
        scale = parseInt(this.value) / 100;
        scaleValue.textContent = `${this.value}%`;
        drawImages();
    }

    function updateScale() {
        // Update to new scale
        scale = parseInt(this.value) / 100;
        scaleValue.textContent = `${this.value}%`;

        if (window.cropModule.isCropping()) {
            window.cropModule.onScaleChange(scale);
        } else {
            // Only redraw images if not in crop mode (crop module handles redrawing in crop mode)
            drawImages();
        }
    }

    function setScale(newScale) {
        scale = newScale;
        const displayScale = Math.round(newScale * 100);
        scaleSlider.value = displayScale;
        scaleValue.textContent = `${displayScale}%`;
    }

    function updateGap() {
        // Convert slider value (0-200) to percentage (0-20)
        const sliderValue = parseInt(this.value);
        gapPercent = sliderValue / 10;

        // Update gap value display with percentage
        gapValue.textContent = `${gapPercent.toFixed(1)}%`;

        // Recalculate pixel gap
        calculatePixelGap();
        drawImages();
    }

    function updateColor() {
        bgColor = this.value;
        drawImages();
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
        let renderGap;
        if (forSaving) {
            // For saving: calculate pixel gap based on average width
            const avgWidth = (images[0].width + images[1].width) / 2;
            renderGap = Math.round(avgWidth * (gapPercent / 100));
        } else {
            // For display: use the current pixel gap and apply scale
            renderGap = pixelGap * renderScale;
        }
        
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
        renderCombinedImage({
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
});