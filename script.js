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
    const trimSlider = document.getElementById('trim');
    const trimValue = document.getElementById('trimValue');

    // Default values
    const DEFAULT_SCALE = 50;
    const DEFAULT_GAP_PERCENT = 7.5; // Gap as percentage (7.5%)
    const DEFAULT_COLOR = '#000000';

    // State variables
    let images = [];
    let imageNames = [];
    let gapPercent = DEFAULT_GAP_PERCENT;
    let bgColor = DEFAULT_COLOR;
    let scale = DEFAULT_SCALE / 100;
    let pixelGap = 0; // Actual pixel gap calculated from percentage
    let trimPercent = 0; // Default trim percentage

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
        if (files.length > 2) {
            alert('Please drop only two images.');
            return;
        }
        processFiles(files);
    });

    // File browser input handler
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        // Add this check to prevent processing when no files are selected (cancel case)
        if (files.length === 0) {
            return;
        }
        if (files.length > 2) {
            alert('Please select only two images.');
        } else {
            processFiles(files);
        }
        fileInput.value = '';
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
        if (files.length > 2) {
            alert('Please drop only two images.');
            return;
        }
        
        processFiles(files);
    });

    // Make the canvas container clickable
    canvasContainer.addEventListener('click', (e) => {
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
    trimSlider.addEventListener('input', updateTrim);

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
            scale = optimalScale / 100;
            scaleSlider.value = optimalScale;
            scaleValue.textContent = `${optimalScale}%`;
            drawImages();
        }
    });

    // =========================
    // Functions
    // =========================

    // Process the selected files
    function processFiles(files) {
        images = [];
        imageNames = [];
        Array.from(files).forEach((file) => {
            if (!file.type.startsWith('image/')) {
                alert('Please select only image files.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    images.push(img);
                    imageNames.push(file.name);
                    if (images.length === 2) {
                        // Show the canvas and hide dropzone when both images are loaded
                        canvasContainer.style.display = 'block';
                        dropzone.style.display = 'none';
                        updateImageNames();

                        // Calculate and set optimal scale
                        calculatePixelGap(); // Calculate pixel gap based on images
                        const optimalScale = calculateOptimalScale(images[0], images[1]);
                        scale = optimalScale / 100;
                        scaleSlider.value = optimalScale;
                        scaleValue.textContent = `${optimalScale}%`;

                        // draw the images
                        drawImages();

                    } else if (images.length === 1 && files.length === 1) {
                        dropzoneMessage.textContent = 'Add one more image';
                        updateImageNames();
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
        
        // Calculate trim amounts
        const leftTrimPixels = Math.floor(img1.width * (trimPercent / 100));
        const rightTrimPixels = Math.floor(img2.width * (trimPercent / 100));
        
        // Calculate total width at 100% scale (using the current pixel gap)
        const totalWidthAt100 = (img1.width - leftTrimPixels) + (img2.width - rightTrimPixels) + pixelGap;
        
        // Calculate the scale percentage needed to fit
        let optimalScale = (viewportWidth / totalWidthAt100) * 100;
        
        // Cap the scale between the min and max values of the slider
        optimalScale = Math.min(Math.max(optimalScale, 1), 100);
        
        return Math.floor(optimalScale); // Round down to nearest integer
    }

    function resetControlsToDefaults() {
        // Reset scale
        scale = DEFAULT_SCALE / 100;
        scaleSlider.value = DEFAULT_SCALE;
        scaleValue.textContent = `${DEFAULT_SCALE}%`;
        
        // Reset gap
        gapPercent = DEFAULT_GAP_PERCENT;
        gapSlider.value = DEFAULT_GAP_PERCENT * 10;
        gapValue.textContent = `${DEFAULT_GAP_PERCENT}%`;
        pixelGap = 0;
        
        // Reset color
        bgColor = DEFAULT_COLOR;
        colorPicker.value = DEFAULT_COLOR;
        
        // Reset trim
        trimPercent = 0;
        trimSlider.value = 0;
        trimValue.textContent = '0%';
    }

    function updateScale() {
        scale = parseInt(this.value) / 100;
        scaleValue.textContent = `${this.value}%`;
        drawImages();
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
    
    function updateTrim() {
        trimPercent = parseInt(this.value);
        trimValue.textContent = `${trimPercent}%`;
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
            calculatePixelGap();
            renderGap = pixelGap * renderScale;
        }
        
        // Calculate trim amounts
        const leftTrimTotal = Math.floor(images[0].width * (trimPercent / 100));
        const rightTrimTotal = Math.floor(images[1].width * (trimPercent / 100));
        
        // Divide the trim evenly between left and right sides
        const leftImageLeftTrim = Math.floor(leftTrimTotal / 2);
        const rightImageLeftTrim = Math.floor(rightTrimTotal / 2);

        // Calculate dimensions with trim
        const img1Width = (images[0].width - leftTrimTotal) * renderScale;
        const img2Width = (images[1].width - rightTrimTotal) * renderScale;
        const totalWidth = img1Width + img2Width + renderGap;
        
        const img1Height = images[0].height * renderScale;
        const img2Height = images[1].height * renderScale;
        const maxHeight = Math.max(img1Height, img2Height);

        // Set canvas dimensions
        targetCanvas.width = totalWidth;
        targetCanvas.height = maxHeight;

        // Clear the canvas
        targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        
        // Fill background with selected color (either just gap or entire canvas)
        targetCtx.fillStyle = bgColor;
        
        if (forSaving) {
            // For saving, fill entire canvas
            targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
        } else {
            // For display, only fill the gap
            targetCtx.fillRect(
                img1Width,                 // X position (after first image)
                0,                         // Y position (top)
                renderGap,                 // Width (just the gap)
                maxHeight                  // Height (full height)
            );
        }
        
        // Draw the first image with trim
        targetCtx.drawImage(
            images[0],
            leftImageLeftTrim, 0,                   // Source position (trimmed from left)
            images[0].width - leftTrimTotal,        // Source width (trimmed from both sides)
            images[0].height,                       // Source height
            0, 0,                                   // Destination position
            img1Width,                              // Destination width
            img1Height                              // Destination height
        );
        
        // Draw the second image with trim
        targetCtx.drawImage(
            images[1],
            rightImageLeftTrim, 0,                  // Source position (trimmed from left)
            images[1].width - rightTrimTotal,       // Source width (trimmed from both sides)
            images[1].height,                       // Source height
            img1Width + renderGap, 0,               // Destination position (after first image + gap)
            img2Width,                              // Destination width
            img2Height                              // Destination height
        );
        
        // Return parameters used for rendering (useful for saving)
        return {
            totalWidth,
            maxHeight,
            img1Width,
            img2Width,
            renderGap
        };
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
});