// ===================================
// ENUMS
// ===================================

// Box positions
const Box = Object.freeze({
    LEFT: 0,
    RIGHT: 1,
    BOTH: 2
});

// Crop handle positions
const Handle = Object.freeze({
    TOP_LEFT: 0,
    TOP_MIDDLE: 1,
    TOP_RIGHT: 2,
    LEFT_MIDDLE: 3,
    RIGHT_MIDDLE: 4,
    BOTTOM_LEFT: 5,
    BOTTOM_MIDDLE: 6,
    BOTTOM_RIGHT: 7,
    INSIDE: 8,
    OUTSIDE: 9,
    TRANSLATION: 10
});

// Movement constraint modes
const Clamp = Object.freeze({
    NO_CLAMP: 0,
    VERTICAL_CLAMP: 1,
    HORIZONTAL_CLAMP: 2
});

// Movement axis types
const Axis = Object.freeze({
    HORIZONTAL: 0,
    VERTICAL: 1,
    DIAGONAL: 2,
    NONE: 3
});

// ===================================
// CROP MANAGER - Main controller for cropping functionality
// ===================================
class CropManager {
    // Exports for external access
    static isCropping = false;
    static isCropped = false;

    // State variables
    static originalImages = null;
    static tempCroppedImages = null;
    static lastCropState = null;
    static cropBoxes = [
        { x: 0, y: 0, width: 0, height: 0, yOffset: 0 },
        { x: 0, y: 0, width: 0, height: 0, yOffset: 0 }
    ];
    static currentScale = 1;
    static currentParams = null;
    static resetScalePercent = 0;
    static preCropScalePercent = 0;
    static alignMode = false;
    static saveCropBoxDimensions = { width: 0, height: 0 };

    // cache the canvas and context
    static canvas = null;
    static ctx = null;

    // UI elements
    static cropButton = null;
    static applyCropButton = null;
    static cancelCropButton = null;
    static resetCropButton = null;
    static cropOptionsControlGroup = null;

    // Initialize the module
    static initialize() {
        this.setupCanvas();
        this.setupDOM();
        this.setupEventListeners();
        CropOptions.initialize(this.cropOptionsControlGroup);
        this.alignMode = CropOptions.alignCheckbox.checked;
        CropInteraction.initialize();
    }

    static setupCanvas() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx.roundRect) {
            // older browsers before 2023 don't have roundRect
            this.ctx.roundRect = this.ctx.rect;
        }
    }

    static setupDOM() {
        // Get control groups to insert crop buttons
        const controlGroups = document.querySelectorAll('.control-group');
        const controlGroup = controlGroups[0];
        
        // Create crop button
        this.cropButton = document.createElement('button');
        this.cropButton.id = 'cropButton';
        this.cropButton.textContent = 'Crop Images';
        controlGroup.appendChild(this.cropButton);
        this.cropButton.disabled = true;
        
        // Apply crop button
        this.applyCropButton = document.createElement('button');
        this.applyCropButton.id = 'applyCrop';
        this.applyCropButton.textContent = 'Apply Crop';
        this.applyCropButton.style.display = 'none';
        controlGroup.appendChild(this.applyCropButton);
        
        // Cancel crop button
        this.cancelCropButton = document.createElement('button');
        this.cancelCropButton.id = 'cancelCrop';
        this.cancelCropButton.textContent = 'Cancel';
        this.cancelCropButton.style.display = 'none';
        controlGroup.appendChild(this.cancelCropButton);
        
        // Reset crop button
        this.resetCropButton = document.createElement('button');
        this.resetCropButton.id = 'resetCrop';
        this.resetCropButton.textContent = 'Reset Crop';
        this.resetCropButton.style.display = 'none';
        controlGroup.appendChild(this.resetCropButton);
        
        // Create crop options control group
        this.cropOptionsControlGroup = document.createElement('div');
        this.cropOptionsControlGroup.id = 'cropOptionsControlGroup';
        this.cropOptionsControlGroup.className = 'control-group';
        this.cropOptionsControlGroup.style.display = 'none';
        controlGroup.appendChild(this.cropOptionsControlGroup);
    }

    static setupEventListeners() {
        this.cropButton.addEventListener('click', () => this.startCrop());
        this.applyCropButton.addEventListener('click', () => this.applyCrop());
        this.cancelCropButton.addEventListener('click', () => this.cancelCrop());
        this.resetCropButton.addEventListener('click', () => this.resetCrop());
    }

    static setCropButtonDisabledState(state) {
        if (this.cropButton) {
            this.cropButton.disabled = state;
        }
    }

    static startCrop() {
        const minDimension = Math.min(SIC.images[0].width, SIC.images[1].width, SIC.images[0].height, SIC.images[1].height);
        if (minDimension < CropBoxHelper.MIN_CROP_SIZE_PIXELS) {
            console.warn(`Not cropping: the image size is smaller than ${CropBoxHelper.MIN_CROP_SIZE_PIXELS} pixels in at least one dimension`);
            alert(`Cannot crop - the image size is smaller than ${CropBoxHelper.MIN_CROP_SIZE_PIXELS} pixels in at least one dimension`);
            return;
        }

        // Store current scale before changing it
        this.preCropScalePercent = ImageRenderer.currentScalePercent();

        // Store original images if not already stored
        if (!this.originalImages) {
            // Save original scale in case we reset the crop while not in crop mode
            this.resetScalePercent = this.preCropScalePercent;
            this.originalImages = [
                SIC.images[0],
                SIC.images[1]
            ];
        } else {
            // For subsequent crops, temporarily restore original images for display
            this.tempCroppedImages = [
                SIC.images[0],
                SIC.images[1]
            ];
            
            // Restore original images for display during cropping
            SIC.images[0] = this.originalImages[0];
            SIC.images[1] = this.originalImages[1];
        }
        
        this.isCropping = true;
        CropInteraction.isDragging = false;
        CropInteraction.isArrowing = false;

        // Show crop controls
        this.cropButton.style.display = 'none';
        this.applyCropButton.style.display = 'block';
        this.cancelCropButton.style.display = 'block';
        this.cropOptionsControlGroup.style.display = 'block';
        UIManager.setSaveButtonDisabledState(true);

        // If we have a previous crop state, restore those dimensions
        if (this.lastCropState) {
            this.cropBoxes[Box.LEFT] = { ...this.lastCropState.boxes[Box.LEFT] };
            this.cropBoxes[Box.RIGHT] = { ...this.lastCropState.boxes[Box.RIGHT] };
            this.saveCropBoxDimensions = { ...this.lastCropState.saveCropBoxDimensions };

            // Swap if necessary
            if (this.lastCropState.swapped) {
                this.swapBoxes(this.cropBoxes);
            }

            // Restore scale
            this.updateScalePercent(this.lastCropState.scalePercent, false, false);
            this.currentScale = ImageRenderer.scale;

            // See if cropBox scale needs to be updated
            if (this.lastCropState.scale !== this.currentScale) {
                this.adjustToNewScale(this.currentScale / this.lastCropState.scale);
            }

            if (SIC.DEBUG) {
                CropValidator.validateCropBoxes("startCrop");
            }
        } else {
            this.updateScalePercent(ImageRenderer.currentScalePercent(), false, false);
            this.currentScale = ImageRenderer.scale;
            this.initCropBoxes();
        }

        // Draw crop interface
        CropInteraction.clampMode = CropOptions.clampCheckbox.checked ? Clamp.HORIZONTAL_CLAMP : Clamp.NO_CLAMP;

        if (this.alignMode) {
            AlignMode.enter();
        } else {
            CropInteraction.currentHandle = Handle.OUTSIDE;
            CropInteraction.activeCropBox = Box.LEFT;
            CropInteraction.updateCursor(CropInteraction.currentHandle);
            CropInteraction.movableBoxes = CropInteraction.getMovableBoxes(CropInteraction.currentHandle);
            CropRenderer.drawCropInterface(CropInteraction.movableBoxes);
        }
    }

    static initCropBoxes() {
        // Get scaled dimensions of images
        const img1Width = SIC.images[0].width * this.currentScale;
        const img1Height = SIC.images[0].height * this.currentScale;
        const img2Width = SIC.images[1].width * this.currentScale;
        const img2Height = SIC.images[1].height * this.currentScale;
        
        // Calculate max possible crop size based on smallest image dimensions
        const maxWidth = Math.min(img1Width, img2Width);
        const maxHeight = Math.min(img1Height, img2Height);
        
        // Set initial crop boxes to use the entire available area
        const xGap = img1Width - maxWidth;
        this.cropBoxes[Box.LEFT] = {
            x: xGap,
            y: 0,
            width: maxWidth,
            height: maxHeight,
            yOffset: 0
        };
        
        this.cropBoxes[Box.RIGHT] = {
            x: 0,
            y: 0,
            width: maxWidth,
            height: maxHeight,
            yOffset: 0
        };

        this.saveCropBoxDimensions = { width: maxWidth, height: maxHeight };
    }

    // Set initial crop state using regions
    static setCropState(cropBoundaries) {
        let { cropX1, cropX2, cropY, cropWidth, cropHeight } = cropBoundaries;
        if (cropWidth < CropBoxHelper.MIN_CROP_SIZE_PIXELS || cropHeight < CropBoxHelper.MIN_CROP_SIZE_PIXELS) {
            console.warn("Not cropping: crop area too small")
            ImageRenderer.drawImages();
            return;
        }

        // prepare for crop
        this.preCropScalePercent = ImageRenderer.currentScalePercent();
        this.resetScalePercent = this.preCropScalePercent;
        this.originalImages = [
            SIC.images[0],
            SIC.images[1]
        ];
        this.currentScale = ImageRenderer.scale;

        // convert to canvas coordinates
        cropX1 *= this.currentScale;
        cropX2 *= this.currentScale;
        cropY *= this.currentScale;
        cropWidth *= this.currentScale;
        cropHeight *= this.currentScale;

        // Initialize crop boxes
        this.cropBoxes[Box.LEFT] = {
            x: cropX1,
            y: cropY,
            width: cropWidth,
            height: cropHeight,
            yOffset: 0
        };

        this.cropBoxes[Box.RIGHT] = {
            x: cropX2,
            y: cropY,
            width: cropWidth,
            height: cropHeight,
            yOffset: 0
        };

        this.saveCropBoxDimensions = { width: cropWidth, height: cropHeight };
        this.finalizeCrop();
    }

    static applyCrop() {
        CropInteraction.onArrowEnd();
        AlignMode.restorePreviousScalePercent();
        this.exitCrop();
        this.finalizeCrop();
    }

    static finalizeCrop() {
        this.isCropped = true;
        this.resetCropButton.style.display = 'block';

        // Save the current crop state before applying
        this.lastCropState = {
            boxes: [{ ...this.cropBoxes[Box.LEFT] }, { ...this.cropBoxes[Box.RIGHT] }],
            saveCropBoxDimensions: { ...this.saveCropBoxDimensions },
            scale: this.currentScale,
            scalePercent: this.currentScale / ImageRenderer.maxScale,
            swapped: false
        };

        // Calculate the crop in original image coordinates
        const cropLeft = {
            x: Math.round(this.cropBoxes[Box.LEFT].x / this.currentScale),
            y: Math.round(this.cropBoxes[Box.LEFT].y / this.currentScale),
            width: Math.round(this.cropBoxes[Box.LEFT].width / this.currentScale),
            height: Math.round(this.cropBoxes[Box.LEFT].height / this.currentScale)
        };
        
        const cropRight = {
            x: Math.round(this.cropBoxes[Box.RIGHT].x / this.currentScale),
            y: Math.round(this.cropBoxes[Box.RIGHT].y / this.currentScale),
            width: Math.round(this.cropBoxes[Box.RIGHT].width / this.currentScale),
            height: Math.round(this.cropBoxes[Box.RIGHT].height / this.currentScale)
        };
        
        // Create temporary canvases to crop the images
        const tempCanvas1 = document.createElement('canvas');
        const tempCanvas2 = document.createElement('canvas');
        
        tempCanvas1.width = cropLeft.width;
        tempCanvas1.height = cropLeft.height;
        tempCanvas2.width = cropRight.width;
        tempCanvas2.height = cropRight.height;
        
        const tempCtx1 = tempCanvas1.getContext('2d');
        const tempCtx2 = tempCanvas2.getContext('2d');
        
        // Draw cropped portions to temp canvases
        tempCtx1.drawImage(SIC.images[0], 
            cropLeft.x, cropLeft.y, cropLeft.width, cropLeft.height,
            0, 0, cropLeft.width, cropLeft.height);
            
        tempCtx2.drawImage(SIC.images[1], 
            cropRight.x, cropRight.y, cropRight.width, cropRight.height,
            0, 0, cropRight.width, cropRight.height);
        
        // Create new image objects from the canvases
        const newImg1 = new Image();
        const newImg2 = new Image();
        
        newImg1.onload = function() {
            SIC.images[0] = newImg1;
            
            newImg2.onload = function() {
                SIC.images[1] = newImg2;
                const scalePercent = StorageManager.getItem('croppedScalePercent', CropManager.preCropScalePercent);
                CropManager.updateScalePercent(scalePercent, false, true);
                ImageRenderer.drawImages();
            };
            newImg2.src = tempCanvas2.toDataURL();
        };
        newImg1.src = tempCanvas1.toDataURL();
    }

    static cancelCrop() {
        // Restore previously cropped images if this was a subsequent crop operation
        if (this.tempCroppedImages) {
            SIC.images[0] = this.tempCroppedImages[0];
            SIC.images[1] = this.tempCroppedImages[1];
            this.tempCroppedImages = null;
        }

        this.exitCrop();
        const scalePercent = this.isCropped ? this.preCropScalePercent : this.resetScalePercent;
        this.updateScalePercent(scalePercent, false, true);
        ImageRenderer.drawImages();
    }

    static exitCrop() {
        this.isCropping = false;
        CropInteraction.isDragging = false;
        CropInteraction.isArrowing = false;
        this.applyCropButton.style.display = 'none';
        this.cancelCropButton.style.display = 'none';
        this.cropOptionsControlGroup.style.display = 'none';
        this.cropButton.style.display = 'block';
        this.canvas.style.cursor = 'default';
        UIManager.setSaveButtonDisabledState(false);
    }

    static resetCrop() {
        if (this.originalImages) {
            this.exitCrop();
            this.resetCropButton.style.display = 'none';
            this.isCropped = false;

            if (SIC.images.length === 2) {
                SIC.images[0] = this.originalImages[0];
                SIC.images[1] = this.originalImages[1];
                this.updateScalePercent(this.resetScalePercent, false, true);
                ImageRenderer.drawImages();
            } else {
                ImageRenderer.setScalePercent(this.resetScalePercent);
            }

            this.originalImages = null;
            this.lastCropState = null;
            this.tempCroppedImages = null;
            CropInteraction.activeCropBox = null;
            CropInteraction.movableBoxes = [false, false];
        }
    }

    static updateScalePercent(scalePercent, overlaid, borders) {
        const optimalScale = ImageRenderer.calculateMaxScale(SIC.images[0], SIC.images[1], overlaid, borders);
        ImageRenderer.setScalePercent(scalePercent, optimalScale);
    }

    static onScaleChange(scalePercent) {
        CropInteraction.onArrowEnd();
        // Only gets called when CropManager.isCropping
        if (scalePercent !== 0) {
            // New scale percent
            if (this.alignMode) {
                AlignMode.scalePercent = scalePercent;
                StorageManager.setItem('alignModeScalePercent', scalePercent);
            } else {
                // Keeping resetScalePercent up to date in case local storage is not working
                this.resetScalePercent = scalePercent;
                StorageManager.setItem('uncroppedScalePercent', scalePercent);
            }
            ImageRenderer.setScalePercent(scalePercent);
        } else {
            // Just adjust to new max scale
            this.updateScalePercent(this.currentScale / ImageRenderer.maxScale, this.alignMode, false);
        }

        // Adjust crop boxes to new scale
        this.adjustToNewScale();

        // Redraw with updated boxes
        CropInteraction.currentHandle = Handle.OUTSIDE;
        CropInteraction.activeCropBox = Box.LEFT;
        CropInteraction.updateCursor(CropInteraction.currentHandle);
        CropInteraction.movableBoxes = CropInteraction.getMovableBoxes(CropInteraction.currentHandle);
        CropRenderer.drawCropInterface(CropInteraction.movableBoxes);
    }

    static onSwap() {
        CropInteraction.onArrowEnd();
        if (this.originalImages) {
            [this.originalImages[0], this.originalImages[1]] = [this.originalImages[1], this.originalImages[0]];
        }
        if (this.tempCroppedImages) {
            [this.tempCroppedImages[0], this.tempCroppedImages[1]] = [this.tempCroppedImages[1], this.tempCroppedImages[0]];
        }

        // Maintain swapped state of lastCropState
        if (this.lastCropState) {
            this.lastCropState.swapped = !this.lastCropState.swapped;
        }

        if (this.isCropping) {
            if (this.alignMode) {
                [AlignMode.alignImage0, AlignMode.alignImage1] = [AlignMode.alignImage1, AlignMode.alignImage0];
            }
            
            this.swapBoxes(this.cropBoxes);
            CropInteraction.currentHandle = Handle.OUTSIDE;
            CropInteraction.activeCropBox = Box.LEFT;
            CropInteraction.updateCursor(CropInteraction.currentHandle);
            CropInteraction.movableBoxes = CropInteraction.getMovableBoxes(CropInteraction.currentHandle);
            CropRenderer.drawCropInterface(CropInteraction.movableBoxes);
        } else {
            ImageRenderer.drawImages();
        }
    }

    static adjustToNewScale(scaleRatio = ImageRenderer.scale / this.currentScale) {
        this.adjustBoxScale(this.cropBoxes[Box.LEFT], scaleRatio);
        this.adjustBoxScale(this.cropBoxes[Box.RIGHT], scaleRatio);
        this.saveCropBoxDimensions.width *= scaleRatio;
        this.saveCropBoxDimensions.height *= scaleRatio;
        this.currentScale = ImageRenderer.scale;
    }
    
    static adjustBoxScale(box, scaleRatio) {
        box.x *= scaleRatio;
        box.y *= scaleRatio;
        box.width *= scaleRatio;
        box.height *= scaleRatio;
        box.yOffset *= scaleRatio;
    }

    static swapBoxes(boxes) {
        [boxes[Box.LEFT], boxes[Box.RIGHT]] = [boxes[Box.RIGHT], boxes[Box.LEFT]];
    }
}

// ===================================
// CROP Options - Handles options for cropping
// ===================================
class CropOptions {
    static alignCheckbox = null;
    static lockedCheckbox = null;
    static clampCheckbox = null;
    static drawBoxesCheckbox = null;

    static initialize(container) {
        // Create align mode checkbox
        this.alignCheckbox = document.createElement('input');
        this.alignCheckbox.type = 'checkbox';
        this.alignCheckbox.id = 'alignCheckbox';
        
        const alignLabel = document.createElement('label');
        alignLabel.htmlFor = 'alignCheckbox';
        alignLabel.textContent = 'Align Mode (a)';
        
        const alignWrapper = document.createElement('div');
        alignWrapper.className = 'control-row';
        alignWrapper.style.marginBottom = '10px';
        alignWrapper.appendChild(this.alignCheckbox);
        alignWrapper.appendChild(alignLabel);
        
        // Create locked checkbox
        this.lockedCheckbox = document.createElement('input');
        this.lockedCheckbox.type = 'checkbox';
        this.lockedCheckbox.id = 'lockedCheckbox';
        
        const lockedLabel = document.createElement('label');
        lockedLabel.htmlFor = 'lockedCheckbox';
        lockedLabel.textContent = 'Synchronized Movement';
        
        const lockedWrapper = document.createElement('div');
        lockedWrapper.className = 'control-row';
        lockedWrapper.style.marginBottom = '10px';
        lockedWrapper.appendChild(this.lockedCheckbox);
        lockedWrapper.appendChild(lockedLabel);
        
        // Create clamp checkbox
        this.clampCheckbox = document.createElement('input');
        this.clampCheckbox.type = 'checkbox';
        this.clampCheckbox.id = 'horizontalClampCheckbox';
        
        const clampLabel = document.createElement('label');
        clampLabel.htmlFor = 'horizontalClampCheckbox';
        clampLabel.textContent = 'Horizontal Only (h)';
        
        const clampWrapper = document.createElement('div');
        clampWrapper.className = 'control-row';
        clampWrapper.style.marginBottom = '10px';
        clampWrapper.appendChild(this.clampCheckbox);
        clampWrapper.appendChild(clampLabel);
        
        // Create draw boxes checkbox
        this.drawBoxesCheckbox = document.createElement('input');
        this.drawBoxesCheckbox.type = 'checkbox';
        this.drawBoxesCheckbox.id = 'drawBoxesCheckbox';
        
        const drawBoxesLabel = document.createElement('label');
        drawBoxesLabel.htmlFor = 'drawBoxesCheckbox';
        drawBoxesLabel.textContent = 'Draw Boxes';
        
        const drawBoxesWrapper = document.createElement('div');
        drawBoxesWrapper.className = 'control-row';
        drawBoxesWrapper.appendChild(this.drawBoxesCheckbox);
        drawBoxesWrapper.appendChild(drawBoxesLabel);
        
        // Add to control group
        container.appendChild(alignWrapper);
        container.appendChild(lockedWrapper);
        container.appendChild(clampWrapper);
        container.appendChild(drawBoxesWrapper);

        // Add event listeners
        this.alignCheckbox.addEventListener('change', () => AlignMode.toggle());
        this.lockedCheckbox.addEventListener('change', () => this.toggleLockedCheckbox());
        this.clampCheckbox.addEventListener('change', () => this.toggleClampCheckbox(false));
        this.drawBoxesCheckbox.addEventListener('change', function() {
            StorageManager.setItem('drawCropBoxes', this.checked);
            CropRenderer.drawCropInterface();
        });

        // Initialize from local storage
        this.alignCheckbox.checked = StorageManager.getItem('alignCheckBox', true);
        this.lockedCheckbox.checked = StorageManager.getItem('lockedCheckBox', true);
        this.clampCheckbox.checked = StorageManager.getItem('clampCheckBox', false);
        this.drawBoxesCheckbox.checked = StorageManager.getItem('drawCropBoxes', true);
    }

    static toggleLockedCheckbox() {
        StorageManager.setItem('lockedCheckBox', this.lockedCheckbox.checked);

        CropInteraction.updateCursor(CropInteraction.currentHandle);
        const wasMovable = CropInteraction.movableBoxes;
        CropInteraction.movableBoxes = CropInteraction.getMovableBoxes(CropInteraction.currentHandle);
        CropRenderer.drawCropInterface(CropInteraction.movableBoxHighlights(wasMovable));
    }

    static toggleClampCheckbox(toggleChecked) {
        if (toggleChecked) {
            this.clampCheckbox.checked = !this.clampCheckbox.checked;
        }

        StorageManager.setItem('clampCheckBox', this.clampCheckbox.checked);
        CropInteraction.clampMode = this.clampCheckbox.checked ? Clamp.HORIZONTAL_CLAMP : Clamp.NO_CLAMP;

        CropInteraction.updateCursor(CropInteraction.currentHandle);
        const wasMovable = CropInteraction.movableBoxes;
        CropInteraction.movableBoxes = CropInteraction.getMovableBoxes(CropInteraction.currentHandle);
        CropRenderer.drawCropInterface(CropInteraction.movableBoxHighlights(wasMovable));
    }
}

// ===================================
// CROP INTERACTION - Handles user interactions with crop functionality
// ===================================
class CropInteraction {
    // Interaction state 
    static isDragging = false;
    static isArrowing = false;
    static currentHandle = null;
    static activeCropBox = null;
    static dragStartX = 0;
    static dragStartY = 0;
    static movableBoxes = [false, false];
    static clampMode = Clamp.NO_CLAMP;
    static movementAxis = Axis.NONE;
    static resizing = false;
    
    // Constants
    static HANDLE_SIZE = 16;
    static GRAB_SIZE = 3 * this.HANDLE_SIZE;
    static FINE_CROP_WINDOW_SIZE = 32;
    static SLOWEST_SPEED = 0.20;
    static LATCH_ZONE_SIZE = this.HANDLE_SIZE / 2;
    
    // Movement tracking
    static totalDeltaX = 0;
    static totalDeltaY = 0;
    static saveActiveBoxXY = null;
    static saveOtherBoxXY = null;
    static xLatch = 0;
    static yLatch = 0;
    
    // Arrow key state
    static arrowKeyMultiplier = 1;
    static deltaYOffsetChangeTimeoutID = null;
    
    static initialize() {
        // Set up canvas event listeners
        const canvas = CropManager.canvas;
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // Touch events
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e));
        
        // Keyboard event
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    static drawHandleBoxes(y) {
        this.getHandle(0, y);
    }

    static getXY(e) {
        const rect = CropManager.canvas.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
    }
    
    static getHandle(x, y) {
        const rightBox = CropManager.cropBoxes[Box.RIGHT];
        if (CropManager.alignMode) {
            const bothHandle = this.getHandleForBox(rightBox, x, y, Box.BOTH, rightBox.x);
            if (bothHandle !== null) {
                return bothHandle.id === Handle.INSIDE ? [Handle.INSIDE, Box.LEFT] : [bothHandle.id, bothHandle.box];
            }
            return [Handle.OUTSIDE, Box.LEFT];
        }

        // Check if the mouse is over any handle of the left crop box
        const leftBox = CropManager.cropBoxes[Box.LEFT];
        const xCanvasLeft = CropManager.currentParams.img1Width - leftBox.width;
        const leftHandle = this.getHandleForBox(leftBox, x, y, Box.LEFT, xCanvasLeft);
        if (leftHandle !== null) {
            return [leftHandle.id, Box.LEFT];
        }
        
        // Check if the mouse is over any handle of the right crop box
        const xCanvasRight = CropManager.currentParams.rightImgStart;
        const rightHandle = this.getHandleForBox(rightBox, x, y, Box.RIGHT, xCanvasRight);
        if (rightHandle !== null) {
            return [rightHandle.id, Box.RIGHT];
        }
        
        return [Handle.OUTSIDE, Box.LEFT];
    }
    
    static getHandleForBox(box, x, y, boxPos, xCanvas) {
        // Apply the offset for right box to get canvas coordinates
        const grabSize = Math.min(this.GRAB_SIZE, (Math.min(box.width, box.height) + 2 * this.HANDLE_SIZE) / 3);

        // Handle positions
        const middlePosX = xCanvas + (box.width - grabSize) / 2;
        const yCanvas = box.y - (boxPos === Box.BOTH ? 0 : box.yOffset);
        const topPosY = yCanvas - this.HANDLE_SIZE;
        const middlePosY = yCanvas + (box.height - grabSize) / 2;
        const bottomPosY = yCanvas + box.height - grabSize + this.HANDLE_SIZE;
        
        let handlePositions;
        if (boxPos === Box.LEFT) {
            const leftPosX = xCanvas - this.HANDLE_SIZE;
            handlePositions = [
                { id: Handle.TOP_LEFT, x: leftPosX, y: topPosY },
                { id: Handle.BOTTOM_LEFT, x: leftPosX, y: bottomPosY },
                // Side handles
                { id: Handle.TOP_MIDDLE, x: middlePosX, y: topPosY },
                { id: Handle.BOTTOM_MIDDLE, x: middlePosX, y: bottomPosY },
                { id: Handle.LEFT_MIDDLE, x: leftPosX, y: middlePosY }
            ];
        } else if (boxPos === Box.RIGHT) {
            const rightPosX = xCanvas + box.width - grabSize + this.HANDLE_SIZE;
            handlePositions = [
                { id: Handle.TOP_RIGHT, x: rightPosX, y: topPosY },
                { id: Handle.BOTTOM_RIGHT, x: rightPosX, y: bottomPosY },
                // Side handles
                { id: Handle.TOP_MIDDLE, x: middlePosX, y: topPosY },
                { id: Handle.BOTTOM_MIDDLE, x: middlePosX, y: bottomPosY },
                { id: Handle.RIGHT_MIDDLE, x: rightPosX, y: middlePosY },
            ];
        } else {
            // alignMode, need to return correct box for handle
            const leftPosX = xCanvas - this.HANDLE_SIZE;
            const rightPosX = xCanvas + box.width - grabSize + this.HANDLE_SIZE;
            handlePositions = [
                { id: Handle.TOP_LEFT, x: leftPosX, y: topPosY, box: Box.LEFT },
                { id: Handle.BOTTOM_LEFT, x: leftPosX, y: bottomPosY, box: Box.LEFT },
                { id: Handle.TOP_RIGHT, x: rightPosX, y: topPosY, box: Box.RIGHT },
                { id: Handle.BOTTOM_RIGHT, x: rightPosX, y: bottomPosY, box: Box.RIGHT },
                // Side handles
                { id: Handle.TOP_MIDDLE, x: middlePosX, y: topPosY, box: Box.LEFT },
                { id: Handle.BOTTOM_MIDDLE, x: middlePosX, y: bottomPosY, box: Box.LEFT },
                { id: Handle.LEFT_MIDDLE, x: leftPosX, y: middlePosY, box: Box.LEFT },
                { id: Handle.RIGHT_MIDDLE, x: rightPosX, y: middlePosY, box: Box.RIGHT }
            ];
        }

        if (SIC.DEBUG) {
            const ctx = CropManager.ctx;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#33ccff';
            for (const handle of handlePositions) {
                const hx = handle.x;
                const hy = handle.y;
                ctx.strokeRect(hx, hy, grabSize, grabSize);
            }
        }

        for (const handle of handlePositions) {
            const hx = handle.x;
            const hy = handle.y;

            if (x >= hx && x <= hx + grabSize &&
                y >= hy && y <= hy + grabSize) {
                return { id: handle.id, box: handle.box };
            }
        }

        // Check if inside the crop box for dragging
        if (!CropOptions.lockedCheckbox.checked && x >= xCanvas && x <= xCanvas + box.width &&
            y >= yCanvas && y <= yCanvas + box.height) {
            return { id: Handle.INSIDE };
        }

        return null;
    }

    static onMouseDown(e) {
        if (!CropManager.isCropping || this.isArrowing) return;
        this.startDrag(e);
    }
    
    static onMouseMove(e) {
        if (!CropManager.isCropping || this.isArrowing) return;

        const [x, y] = this.getXY(e);

        if (!this.isDragging) {
            // Update cursor based on handle
            [this.currentHandle, this.activeCropBox] = this.getHandle(x, y);
            this.updateCursor(this.currentHandle);

            // Check if highlights should be shown
            const wasMovable = this.movableBoxes;
            this.movableBoxes = this.getMovableBoxes(this.currentHandle);
            CropRenderer.drawCropInterface(this.movableBoxHighlights(wasMovable));
        } else {
            const [deltaX, deltaY, highlights] = this.tweakXY(x - this.dragStartX, y - this.dragStartY);
            CropBoxHelper.updateCropBoxes(this.currentHandle, this.activeCropBox, deltaX, deltaY);
            this.movableBoxes = this.getMovableBoxes(this.currentHandle);
            CropRenderer.drawCropInterface(highlights);

            if (SIC.DEBUG && this.movementAxis === Axis.NONE && !this.resizing) {
                const ctx = CropManager.ctx;
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ff88ff'
                ctx.strokeRect(x - this.totalDeltaX - this.LATCH_ZONE_SIZE, y - this.totalDeltaY - this.LATCH_ZONE_SIZE,
                    this.LATCH_ZONE_SIZE * 2, this.LATCH_ZONE_SIZE * 2);
                ctx.strokeStyle = '#4488ff'
                ctx.strokeRect(x - this.totalDeltaX - this.FINE_CROP_WINDOW_SIZE, y - this.totalDeltaY - this.FINE_CROP_WINDOW_SIZE,
                    this.FINE_CROP_WINDOW_SIZE * 2, this.FINE_CROP_WINDOW_SIZE * 2);
            }
        }
        this.dragStartX = x;
        this.dragStartY = y;
    }
    
    static onMouseUp(e) {
        if (CropManager.isCropping && this.isDragging) {
            this.isDragging = false;
            this.clampMode = CropOptions.clampCheckbox.checked ? Clamp.HORIZONTAL_CLAMP : Clamp.NO_CLAMP;

            // Ensure that both images are not above or below the top of the canvas
            CropAnimation.animateFixImagePositions();

            if (CropManager.alignMode && this.currentHandle === Handle.INSIDE) {
                // Grow the boxes as much as possible after shrinking and repositioning them
                CropBoxHelper.growBoxes(CropManager.cropBoxes[Box.LEFT], CropManager.cropBoxes[Box.RIGHT]);
            }

            // Update cursor and cropbox movable state
            this.onMouseMove(e);
        }
    }
    
    static onTouchStart(e) {
        if (!CropManager.isCropping) return;
        e.preventDefault();
        if (this.isArrowing) return;
        this.startDrag(e.touches[0]);
    }
    
    static onTouchMove(e) {
        if (!CropManager.isCropping) return;
        e.preventDefault();
        if (!this.isDragging) return;

        const [x, y] = this.getXY(e.touches[0]);
        const [deltaX, deltaY, highlights] = this.tweakXY(x - this.dragStartX, y - this.dragStartY);

        CropBoxHelper.updateCropBoxes(this.currentHandle, this.activeCropBox, deltaX, deltaY);
        this.movableBoxes = this.getMovableBoxes(this.currentHandle);
        CropRenderer.drawCropInterface(highlights);

        this.dragStartX = x;
        this.dragStartY = y;
    }
    
    static onTouchEnd(e) {
        if (!CropManager.isCropping) return;
        e.preventDefault();
        if (!this.isDragging) return;
        this.isDragging = false;
        this.clampMode = CropOptions.clampCheckbox.checked ? Clamp.HORIZONTAL_CLAMP : Clamp.NO_CLAMP;

        // Ensure that both images are not above or below the top of the canvas
        CropAnimation.animateFixImagePositions();

        if (CropManager.alignMode && this.currentHandle === Handle.INSIDE) {
            // Grow the boxes as much as possible after shrinking and repositioning them
            CropBoxHelper.growBoxes(CropManager.cropBoxes[Box.LEFT], CropManager.cropBoxes[Box.RIGHT]);
        }

        // Update cursor based on handle
        const [x, y] = this.getXY(e.changedTouches[0]);
        [this.currentHandle, this.activeCropBox] = this.getHandle(x, y);
        this.updateCursor(this.currentHandle);
        
        // Check if highlights should be shown
        const wasMovable = this.movableBoxes;
        this.movableBoxes = this.getMovableBoxes(this.currentHandle);
        CropRenderer.drawCropInterface(this.movableBoxHighlights(wasMovable));
    }
    
    static startDrag(e) {
        this.isDragging = true;

        // Check if highlights should be shown
        const wasMovable = this.movableBoxes;
        const [x, y] = this.getXY(e);
        [this.currentHandle, this.activeCropBox] = this.getHandle(x, y);
        this.updateCursor(this.currentHandle);
        this.movableBoxes = this.getMovableBoxes(this.currentHandle);
        this.startMove();
        CropRenderer.drawCropInterface(this.movableBoxHighlights(wasMovable));

        // Set up for tweakXY
        this.dragStartX = x;
        this.dragStartY = y;
        const activeBox = CropManager.cropBoxes[this.activeCropBox];
        const otherBox = CropManager.cropBoxes[1 - this.activeCropBox];
        this.saveActiveBoxXY = { x: activeBox.x, y: activeBox.y, yOffset: activeBox.yOffset };
        this.saveOtherBoxXY = { x: otherBox.x, y: otherBox.y, yOffset: otherBox.yOffset };
        this.totalDeltaX = 0;
        this.totalDeltaY = 0;
        this.xLatch = 0;
        this.yLatch = 0;
        this.movementAxis = Axis.NONE;
    }
    
    static startMove() {
        this.resizing = this.currentHandle !== Handle.INSIDE && this.currentHandle !== Handle.OUTSIDE;
        if (CropManager.alignMode && this.currentHandle === Handle.INSIDE) {
            // Shrink the boxes so they have room to move around
            CropBoxHelper.shrinkBoxes(CropManager.cropBoxes[Box.LEFT], CropManager.cropBoxes[Box.RIGHT]);
        }
    }
    
    static updateCursor(handle) {
        const canvas = CropManager.canvas;
        
        switch (handle) {
            case Handle.TOP_LEFT:
            case Handle.BOTTOM_RIGHT:
                canvas.style.cursor = 'nwse-resize';
                break;
            case Handle.TOP_RIGHT:
            case Handle.BOTTOM_LEFT:
                canvas.style.cursor = 'nesw-resize';
                break;
            case Handle.TOP_MIDDLE:
            case Handle.BOTTOM_MIDDLE:
                canvas.style.cursor = 'ns-resize';
                break;
            case Handle.LEFT_MIDDLE:
            case Handle.RIGHT_MIDDLE:
                canvas.style.cursor = 'ew-resize';
                break;
            case Handle.TRANSLATION:
            case Handle.INSIDE:
            case Handle.OUTSIDE:
                if (this.clampMode === Clamp.HORIZONTAL_CLAMP) {
                    canvas.style.cursor = 'ew-resize';
                } else if (this.clampMode === Clamp.VERTICAL_CLAMP) {
                    canvas.style.cursor = 'ns-resize';
                } else {
                    canvas.style.cursor = 'move';
                }
                break;
            default:
                canvas.style.cursor = 'default';
        }
        
        if (this.isDragging) {
            document.documentElement.style.cursor = canvas.style.cursor;
        } else {
            document.documentElement.style.cursor = 'default';
        }
    }
    
    static tweakXY(deltaX, deltaY) {
        // Calculate total movement so far
        this.totalDeltaX += deltaX;
        this.totalDeltaY += deltaY;
        let absTotalDeltaX = Math.abs(this.totalDeltaX);
        let absTotalDeltaY = Math.abs(this.totalDeltaY);
        
        if (absTotalDeltaX > this.LATCH_ZONE_SIZE) {
            this.xLatch = this.LATCH_ZONE_SIZE;
        } else if (absTotalDeltaX < this.xLatch) {
            absTotalDeltaX = this.xLatch;
        }
        
        if (absTotalDeltaY > this.LATCH_ZONE_SIZE) {
            this.yLatch = this.LATCH_ZONE_SIZE;
        } else if (absTotalDeltaY < this.yLatch) {
            absTotalDeltaY = this.yLatch;
        }
        
        const totalDistanceSquared = absTotalDeltaX * absTotalDeltaX + absTotalDeltaY * absTotalDeltaY;

        // Apply fine movement control
        const speedFactor = Math.max(this.SLOWEST_SPEED, Math.min(1, totalDistanceSquared / (this.FINE_CROP_WINDOW_SIZE * this.FINE_CROP_WINDOW_SIZE)));
        let xMove = deltaX * speedFactor;
        let yMove = deltaY * speedFactor;

        // We're done here if resizing or aligning...
        let highlights = [false, false];
        if (this.resizing || (CropManager.alignMode && !CropOptions.clampCheckbox.checked && this.currentHandle === Handle.INSIDE)) {
            return [xMove, yMove, highlights];
        }

        // Update yMove and xMove based on direction of translation
        if (this.movementAxis === Axis.NONE) {
            const inLatchZone = this.xLatch === 0 || this.yLatch === 0;
            const otherBox = 1 - this.activeCropBox;
            
            if (CropOptions.clampCheckbox.checked) {
                this.movementAxis = Axis.HORIZONTAL;
                this.clampMode = Clamp.HORIZONTAL_CLAMP;
                yMove = 0;
            } else if (totalDistanceSquared > this.FINE_CROP_WINDOW_SIZE * this.FINE_CROP_WINDOW_SIZE) {
                // We have our direction! Let the user know...
                highlights[this.activeCropBox] = true;
                
                if (!inLatchZone) {
                    this.movementAxis = Axis.DIAGONAL;
                    this.clampMode = Clamp.NO_CLAMP;
                } else if (absTotalDeltaX > absTotalDeltaY) {
                    this.movementAxis = Axis.HORIZONTAL;
                    this.clampMode = Clamp.HORIZONTAL_CLAMP;
                    yMove = 0;
                    // Zero out the vertical direction
                    CropManager.cropBoxes[this.activeCropBox].y = this.saveActiveBoxXY.y;
                    CropManager.cropBoxes[this.activeCropBox].yOffset = this.saveActiveBoxXY.yOffset;
                    CropManager.cropBoxes[otherBox].y = this.saveOtherBoxXY.y;
                    CropManager.cropBoxes[otherBox].yOffset = this.saveOtherBoxXY.yOffset;
                } else {
                    this.movementAxis = Axis.VERTICAL;
                    this.clampMode = Clamp.VERTICAL_CLAMP;
                    xMove = 0;
                    // Zero out the horizontal direction
                    CropManager.cropBoxes[this.activeCropBox].x = this.saveActiveBoxXY.x;
                    CropManager.cropBoxes[otherBox].x = this.saveOtherBoxXY.x;
                }
            // Still deciding on direction
            } else if (!inLatchZone) {
                if (absTotalDeltaX > absTotalDeltaY) {
                    this.yLatch = 0;
                } else {
                    this.xLatch = 0;
                }
                this.clampMode = Clamp.NO_CLAMP;
            } else if (absTotalDeltaX > absTotalDeltaY) {
                this.clampMode = Clamp.HORIZONTAL_CLAMP;
                yMove = 0;
                CropManager.cropBoxes[this.activeCropBox].y = this.saveActiveBoxXY.y;
                CropManager.cropBoxes[this.activeCropBox].yOffset = this.saveActiveBoxXY.yOffset;
                CropManager.cropBoxes[otherBox].y = this.saveOtherBoxXY.y;
                CropManager.cropBoxes[otherBox].yOffset = this.saveOtherBoxXY.yOffset;
                this.yLatch = 0;
            } else {
                this.clampMode = Clamp.VERTICAL_CLAMP;
                xMove = 0;
                CropManager.cropBoxes[this.activeCropBox].x = this.saveActiveBoxXY.x;
                CropManager.cropBoxes[otherBox].x = this.saveOtherBoxXY.x;
                this.xLatch = 0;
            }
            this.updateCursor(Handle.TRANSLATION);
        } else if (this.movementAxis === Axis.HORIZONTAL) {
            yMove = 0;
        } else if (this.movementAxis === Axis.VERTICAL) {
            xMove = 0;
        }

        return [xMove, yMove, highlights];
    }

    static getMovableBoxes(handle) {
        if (handle === Handle.INSIDE || handle === Handle.OUTSIDE) {
            // For moves, we need to check if boxes can actually move
            const leftCanMove = CropBoxHelper.canBoxMove(CropManager.cropBoxes[Box.LEFT], Box.LEFT, handle);
            const rightCanMove = CropBoxHelper.canBoxMove(CropManager.cropBoxes[Box.RIGHT], Box.RIGHT, handle);
    
            // Determine which directions are valid based on current clamp mode
            const canMoveHorizontal = this.clampMode !== Clamp.VERTICAL_CLAMP;
            const canMoveVertical = this.clampMode !== Clamp.HORIZONTAL_CLAMP;
    
            // Check if the boxes can move within the constraints of the current clamp mode
            const leftCanMoveWithinClamp = (
                (canMoveHorizontal && (leftCanMove.canMoveLeft || leftCanMove.canMoveRight)) ||
                (canMoveVertical && (leftCanMove.canMoveUp || leftCanMove.canMoveDown))
            );
            
            const rightCanMoveWithinClamp = (
                (canMoveHorizontal && (rightCanMove.canMoveLeft || rightCanMove.canMoveRight)) ||
                (canMoveVertical && (rightCanMove.canMoveUp || rightCanMove.canMoveDown))
            );
    
            if (handle === Handle.INSIDE) {
                // Check if the active box can move within current clamp constraints
                // In align mode, movement is allowed if either cropbox can move
                if (CropManager.alignMode) {
                    return [leftCanMoveWithinClamp, rightCanMoveWithinClamp];
                } else if (this.activeCropBox === Box.LEFT) {
                    return [leftCanMoveWithinClamp, false];
                } else {
                    return [false, rightCanMoveWithinClamp];
                }
            } else if (handle === Handle.OUTSIDE) {
                // For outside handle, check if both boxes can move in the same allowed direction
                const bothCanMoveHorizontal = 
                    canMoveHorizontal && 
                    ((leftCanMove.canMoveLeft && rightCanMove.canMoveLeft) || 
                     (leftCanMove.canMoveRight && rightCanMove.canMoveRight));

                const bothCanMoveVertical = 
                    canMoveVertical && 
                    ((leftCanMove.canMoveUp && rightCanMove.canMoveUp) || 
                     (leftCanMove.canMoveDown && rightCanMove.canMoveDown));
                     
                const bothCanMove = bothCanMoveHorizontal || bothCanMoveVertical;

                return [bothCanMove, bothCanMove];
            }
        }
        
        // For resize operations, both boxes are always movable
        return [true, true];
    }
    
    static movableBoxHighlights(wasMovable) {
        const changeToMovableBoxes = this.movableBoxes[Box.LEFT] !== wasMovable[Box.LEFT] || 
                                     this.movableBoxes[Box.RIGHT] !== wasMovable[Box.RIGHT];
        const leftBoxHighlight = (this.movableBoxes[Box.LEFT] && changeToMovableBoxes);
        const rightBoxHighlight = (this.movableBoxes[Box.RIGHT] && changeToMovableBoxes);
        return [leftBoxHighlight, rightBoxHighlight];
    }
    
    static onKeyDown(e) {
        // Check if an input element is focused
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA') {
            return;
        }

        if (!CropManager.isCropping) return;

        if (this.activeCropBox === null) {
            this.activeCropBox = Box.LEFT;
        }
        
        let deltaX = 0;
        let deltaY = 0;
        
        // Set multiplier for Shift key (faster movement)
        this.arrowKeyMultiplier = e.shiftKey ? 5 : 1;
        
        // Handle key presses
        switch (e.key) {
            case 'a':
                AlignMode.toggle();
                e.preventDefault();
                return;
            case 'h':
                CropOptions.toggleClampCheckbox(true);
                e.preventDefault();
                return;
            case 'ArrowLeft':
                deltaX = -1 * this.arrowKeyMultiplier;
                e.preventDefault();
                break;
            case 'ArrowRight':
                deltaX = 1 * this.arrowKeyMultiplier;
                e.preventDefault();
                break;
            case 'ArrowUp':
                deltaY = -1 * this.arrowKeyMultiplier;
                e.preventDefault();
                break;
            case 'ArrowDown':
                deltaY = 1 * this.arrowKeyMultiplier;
                e.preventDefault();
                break;
            case 'Tab':
                // Toggle between left, right, and both boxes
                e.preventDefault();
                const wasMovable = this.movableBoxes;
                this.movableBoxes = this.nextTab();
                
                if (!this.movableBoxes[Box.LEFT] && !this.movableBoxes[Box.RIGHT]) {
                    this.movableBoxes = this.nextTab();
                    if (!CropManager.alignMode && !this.movableBoxes[Box.LEFT] && !this.movableBoxes[Box.RIGHT]) {
                        this.movableBoxes = this.nextTab();
                    }
                }
                
                CropRenderer.drawCropInterface(this.movableBoxHighlights(wasMovable));
                return;
            default:
                return; // Ignore other keys
        }

        // Set up for moving boxes
        if (!this.isArrowing) {
            this.isArrowing = true;
            this.startMove();
        }

        // Set up for movement
        CropBoxHelper.updateCropBoxes(this.currentHandle, this.activeCropBox, deltaX, deltaY);

        // Stop any scheduled process
        if (this.deltaYOffsetChangeTimeoutID) {
            clearTimeout(this.deltaYOffsetChangeTimeoutID);
        }
        
        // Ensure that both images are not above or below the top of the canvas
        // Delay until the user releases the key
        this.deltaYOffsetChangeTimeoutID = setTimeout(
            () => this.onArrowEnd(),
            CropManager.alignMode && this.currentHandle === Handle.INSIDE ? 1500 : 500
        );

        // Redraw the interface
        CropRenderer.drawCropInterface();
    }
    
    static onArrowEnd() {
        // Stop any scheduled process
        if (this.deltaYOffsetChangeTimeoutID) {
            clearTimeout(this.deltaYOffsetChangeTimeoutID);
            this.deltaYOffsetChangeTimeoutID = null;
        }

        if (CropManager.isCropping && this.isArrowing) {
            this.isArrowing = false;

            // Ensure that both images are not above or below the top of the canvas
            CropAnimation.animateFixImagePositions();

            if (CropManager.alignMode && this.currentHandle === Handle.INSIDE) {
                // Grow the boxes as much as possible after shrinking and repositioning them
                CropBoxHelper.growBoxes(CropManager.cropBoxes[Box.LEFT], CropManager.cropBoxes[Box.RIGHT]);
            }

            CropRenderer.drawCropInterface();
        }
    }
    
    static nextTab() {
        if (this.currentHandle === Handle.OUTSIDE) {
            this.currentHandle = Handle.INSIDE;
            this.activeCropBox = Box.LEFT;
        } else if (this.activeCropBox === Box.LEFT && !CropManager.alignMode) {
            this.activeCropBox = Box.RIGHT;
        } else {
            this.currentHandle = Handle.OUTSIDE;
            this.activeCropBox = Box.LEFT;
        }
        return this.getMovableBoxes(this.currentHandle);
    }
}

// ===================================
// CROP BOX HELPER - Utilities for managing crop boxes
// ===================================
class CropBoxHelper {
    static epsilon = 0.001;
    static MIN_CROP_SIZE_PIXELS = 3 * CropInteraction.HANDLE_SIZE;
    
    static updateCropBoxes(handle, activeBox, deltaX, deltaY) {
        const img1Width = SIC.images[0].width * CropManager.currentScale;
        const img1Height = SIC.images[0].height * CropManager.currentScale;
        const img2Width = SIC.images[1].width * CropManager.currentScale;
        const img2Height = SIC.images[1].height * CropManager.currentScale;
        
        // The other box
        const otherBox = 1 - activeBox;
        
        // Create copies to simulate changes without affecting the actual boxes yet
        const testActiveBox = { ...CropManager.cropBoxes[activeBox] };
        
        if (handle === Handle.OUTSIDE) {
            // In align mode, we're moving the crop boxes, not the image
            if (CropManager.alignMode) {
                deltaX = -deltaX;
                deltaY = -deltaY;
            }
            
            // If moving both boxes, enforce limits of both boxes
            const activeResult = this.moveBox(testActiveBox, deltaX, deltaY, 
                activeBox === Box.LEFT ? img1Width : img2Width,
                activeBox === Box.LEFT ? img1Height : img2Height);

            // Now try moving the other box by the same actual deltas
            const otherResult = this.moveBox(CropManager.cropBoxes[otherBox], activeResult.x, activeResult.y, 
                otherBox === Box.LEFT ? img1Width : img2Width,
                otherBox === Box.LEFT ? img1Height : img2Height);

            // Apply (possibly constrained) changes to activeBox
            this.moveBox(CropManager.cropBoxes[activeBox], otherResult.x, otherResult.y, 
                activeBox === Box.LEFT ? img1Width : img2Width,
                activeBox === Box.LEFT ? img1Height : img2Height);

        } else if (handle === Handle.INSIDE) {
            // Only move the active box
            const { x, y } =
                this.moveBox(CropManager.cropBoxes[activeBox], deltaX, deltaY, 
                    activeBox === Box.LEFT ? img1Width : img2Width,
                    activeBox === Box.LEFT ? img1Height : img2Height);
                    
            // In alignMode, move the other box when the active one can't move
            if (CropManager.alignMode) {
                this.moveBox(CropManager.cropBoxes[otherBox], x - deltaX, y - deltaY, 
                    otherBox === Box.LEFT ? img1Width : img2Width,
                    otherBox === Box.LEFT ? img1Height : img2Height);    
            }
        } else {
            // Resize operation
            // Store the original dimensions
            const originalActiveWidth = testActiveBox.width;
            const originalActiveHeight = testActiveBox.height;
            const originalActiveX = testActiveBox.x;
            const originalActiveY = testActiveBox.y;

            // Simulate update on the test active box
            this.resizeBox(testActiveBox, handle, deltaX, deltaY, 
                activeBox === Box.LEFT ? img1Width : img2Width,
                activeBox === Box.LEFT ? img1Height : img2Height);
            
            // Calculate changes in dimensions and position
            const widthChange = testActiveBox.width - originalActiveWidth;
            const heightChange = testActiveBox.height - originalActiveHeight;
            const xChange = testActiveBox.x - originalActiveX;
            const yChange = testActiveBox.y - originalActiveY;
            
            // Apply the same type of changes to the test other box
            const testOtherBox = { ...CropManager.cropBoxes[otherBox] };
            
            // Handle x position changes (left edge)
            if ([Handle.TOP_LEFT, Handle.LEFT_MIDDLE, Handle.BOTTOM_LEFT].includes(handle)) {
                testOtherBox.x += xChange;
                testOtherBox.width -= xChange; // Compensate width for left edge movement
            }
            
            // Handle y position changes (top edge)
            if ([Handle.TOP_LEFT, Handle.TOP_MIDDLE, Handle.TOP_RIGHT].includes(handle)) {
                testOtherBox.y += yChange;
                testOtherBox.height -= yChange; // Compensate height for top edge movement
            }
            
            // Handle width changes (right edge)
            if ([Handle.TOP_RIGHT, Handle.RIGHT_MIDDLE, Handle.BOTTOM_RIGHT].includes(handle)) {
                testOtherBox.width += widthChange;
            }
            
            // Handle height changes (bottom edge)
            if ([Handle.BOTTOM_LEFT, Handle.BOTTOM_MIDDLE, Handle.BOTTOM_RIGHT].includes(handle)) {
                testOtherBox.height += heightChange;
            }
            
            // Check if both test boxes would be valid after the resize
            if (!this.isBoxInBounds(testActiveBox,
                              activeBox === Box.LEFT ? img1Width : img2Width,
                              activeBox === Box.LEFT ? img1Height : img2Height) ||
                !this.isBoxInBounds(testOtherBox,
                              otherBox === Box.LEFT ? img1Width : img2Width,
                              otherBox === Box.LEFT ? img1Height : img2Height)) {
                // If either box would be out of bounds, don't allow the resize
                return;
            }

            // If we reach here, the resize is valid for both boxes
            // Apply the changes to the real boxes
            CropManager.cropBoxes[activeBox] = testActiveBox;
            CropManager.cropBoxes[otherBox] = testOtherBox;

            // Remember the size of the boxes for growing them after positioning them in align mode
            CropManager.saveCropBoxDimensions = { width: CropManager.cropBoxes[Box.LEFT].width, height: CropManager.cropBoxes[Box.LEFT].height };
        }

        if (SIC.DEBUG) {
            // Final validation to ensure boxes stay within bounds
            CropValidator.validateCropBoxes("updateCropBoxes");
        }
    }
    
    static moveBox(box, deltaX, deltaY, maxWidth, maxHeight) {
        // Calculate new position
        const newX = Math.max(0, Math.min(box.x - deltaX, maxWidth - box.width));
        const newY = Math.max(0, Math.min(box.y - deltaY, maxHeight - box.height));

        // Calculate actual change applied
        const actualDeltaX = box.x - newX;
        box.x = newX;

        const actualDeltaY = box.y - newY;
        box.y = newY;
        box.yOffset -= actualDeltaY;
        
        // Return actual changes applied (might be different from requested due to constraints)
        return { x: actualDeltaX, y: actualDeltaY };
    }
    
    static resizeBox(box, handle, deltaX, deltaY, maxWidth, maxHeight) {
        const minCropSizeCanvas = this.MIN_CROP_SIZE_PIXELS * CropManager.currentScale;
        const boxAspectRatio = box.width / box.height;
        
        // Handle corner resize cases (maintains aspect ratio)
        if ([Handle.TOP_LEFT, Handle.TOP_RIGHT, Handle.BOTTOM_LEFT, Handle.BOTTOM_RIGHT].includes(handle)) {
            // Create a mapping of corner handles to their direction vectors
            const cornerDirections = {
                [Handle.TOP_LEFT]: { x: -boxAspectRatio, y: -1 },
                [Handle.TOP_RIGHT]: { x: boxAspectRatio, y: -1 },
                [Handle.BOTTOM_LEFT]: { x: -boxAspectRatio, y: 1 },
                [Handle.BOTTOM_RIGHT]: { x: boxAspectRatio, y: 1 }
            };

            // Get the direction for this corner
            const { x: dirX, y: dirY } = cornerDirections[handle];
                
            // Normalize the direction vector
            const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
            const normalizedDirX = dirX / dirLength;
            const normalizedDirY = dirY / dirLength;
            
            // Project the mouse movement onto the direction vector
            const dotProduct = deltaX * normalizedDirX + deltaY * normalizedDirY;
            
            // Calculate the movement along the aspect ratio direction
            deltaX = dotProduct * normalizedDirX;
            // deltaY = dotProduct * normalizedDirY;
        }
        
        // Handle all resize cases
        switch (handle) {
            case Handle.TOP_LEFT: {
                // Adjust x position and width
                const newX = Math.max(0, Math.min(box.x + deltaX, box.x + box.width - minCropSizeCanvas));
                const widthChange = box.x - newX;
                box.x = newX;
                box.width += widthChange;
                
                // Maintain aspect ratio
                const newHeight = box.width / boxAspectRatio;
                const heightChange = box.height - newHeight;
                box.y += heightChange;
                box.height = newHeight;
                break;
            }
            
            case Handle.TOP_RIGHT: {
                // Adjust width
                box.width = Math.max(minCropSizeCanvas, Math.min(box.width + deltaX, maxWidth - box.x));
                
                // Maintain aspect ratio
                const newHeight = box.width / boxAspectRatio;
                const heightChange = box.height - newHeight;
                box.y += heightChange;
                box.height = newHeight;
                break;
            }
            
            case Handle.BOTTOM_LEFT: {
                // Adjust x position and width
                const newX = Math.max(0, Math.min(box.x + deltaX, box.x + box.width - minCropSizeCanvas));
                const widthChange = box.x - newX;
                box.x = newX;
                box.width += widthChange;
                
                // Maintain aspect ratio
                box.height = box.width / boxAspectRatio;
                break;
            }
            
            case Handle.BOTTOM_RIGHT: {
                // Adjust width
                box.width = Math.max(minCropSizeCanvas, Math.min(box.width + deltaX, maxWidth - box.x));
                
                // Maintain aspect ratio
                box.height = box.width / boxAspectRatio;
                break;
            }
            
            case Handle.TOP_MIDDLE: {
                // Adjust y position and height - no aspect ratio
                const newY = Math.max(0, Math.min(box.y + deltaY, box.y + box.height - minCropSizeCanvas));
                const heightChange = box.y - newY;
                box.y = newY;
                box.height += heightChange;
                break;
            }
            
            case Handle.RIGHT_MIDDLE: {
                // Adjust width - no aspect ratio
                box.width = Math.max(minCropSizeCanvas, Math.min(box.width + deltaX, maxWidth - box.x));
                break;
            }
            
            case Handle.BOTTOM_MIDDLE: {
                // Adjust height - no aspect ratio
                box.height = Math.max(minCropSizeCanvas, Math.min(box.height + deltaY, maxHeight - box.y));
                break;
            }
            
            case Handle.LEFT_MIDDLE: {
                // Adjust x position and width - no aspect ratio
                const newX = Math.max(0, Math.min(box.x + deltaX, box.x + box.width - minCropSizeCanvas));
                const widthChange = box.x - newX;
                box.x = newX;
                box.width += widthChange;
                break;
            }
        }
    }
    
    static isBoxInBounds(box, maxWidth, maxHeight) {
        const minCropSizeCanvas = this.MIN_CROP_SIZE_PIXELS * CropManager.currentScale;
        
        // Check all constraints
        if (box.x < -this.epsilon) return false;
        if (box.y < -this.epsilon) return false;
        if (box.width < minCropSizeCanvas - this.epsilon) return false;
        if (box.height < minCropSizeCanvas - this.epsilon) return false;
        if (box.x + box.width > maxWidth + this.epsilon) return false;
        if (box.y + box.height > maxHeight + this.epsilon) return false;
        
        return true;
    }
    
    static canBoxMove(box, boxPos, handle) {
        let { x, y, width, height } = box;
        
        // In alignMode we shrink the boxes so they can move
        if (CropManager.alignMode && handle === Handle.INSIDE) {
            const minCropSizeCanvas = this.MIN_CROP_SIZE_PIXELS * CropManager.currentScale;
            const ratio = width / height;
            if (ratio > 1) {
                width = ratio * minCropSizeCanvas;
                height = minCropSizeCanvas;
            } else {
                width = minCropSizeCanvas;
                height = minCropSizeCanvas / ratio;
            }
            x += width - box.width;
            y += height - box.height;
        }

        const maxWidth = SIC.images[boxPos].width * CropManager.currentScale;
        const maxHeight = SIC.images[boxPos].height * CropManager.currentScale;

        // Check if there's room to move in any direction
        const canMoveLeft = x > this.epsilon;
        const canMoveRight = x + width < maxWidth - this.epsilon;
        const canMoveUp = y > this.epsilon;
        const canMoveDown = y + height < maxHeight - this.epsilon;
        
        return { canMoveLeft, canMoveRight, canMoveUp, canMoveDown };
    }

    static shrinkBoxes(box1, box2) {
        const minCropSizeCanvas = this.MIN_CROP_SIZE_PIXELS * CropManager.currentScale;

        const width = box1.width;
        const height = box1.height;
        const ratio = width / height;
        
        if (ratio > 1) {
            box1.width = box2.width = ratio * minCropSizeCanvas;
            box1.height = box2.height = minCropSizeCanvas;
        } else {
            box1.width = box2.width = minCropSizeCanvas;
            box1.height = box2.height = minCropSizeCanvas / ratio;
        }
        
        // Shrink down to lower right
        box1.x += width - box1.width;
        box2.x += width - box2.width;
        box1.y += height - box1.height;
        box2.y += height - box2.height;
    }
    
    static growCorner(leftBox, rightBox, xGrow, yGrow, ratio) {
        let xDir, yDir;
        if (yGrow && ratio > Math.abs(xGrow / yGrow)) {
            xDir = xGrow;
            yDir = xGrow / ratio;
        } else {
            xDir = yGrow * ratio;
            yDir = yGrow;
        }
        leftBox.width += xDir;
        rightBox.width += xDir;
        leftBox.height += yDir;
        rightBox.height += yDir;
        return { xDir, yDir };
    }
    
    static growBoxes(leftBox, rightBox) {
        const img1Width = SIC.images[0].width * CropManager.currentScale;
        const img1Height = SIC.images[0].height * CropManager.currentScale;
        const img2Width = SIC.images[1].width * CropManager.currentScale;
        const img2Height = SIC.images[1].height * CropManager.currentScale;
        const maxWidth = CropManager.saveCropBoxDimensions.width;
        const maxHeight = CropManager.saveCropBoxDimensions.height;
        const ratio = maxWidth / maxHeight;

        // Top left
        {
            const maxX = Math.min(leftBox.x, rightBox.x, maxWidth - leftBox.width);
            const maxY = Math.min(leftBox.y, rightBox.y, maxHeight - leftBox.height);

            const { xDir, yDir } = this.growCorner(leftBox, rightBox, maxX, maxY, ratio);
            leftBox.x -= xDir;
            rightBox.x -= xDir;
            leftBox.y -= yDir;
            leftBox.yOffset -= yDir;
            rightBox.y -= yDir;
            rightBox.yOffset -= yDir;
        }

        // Bottom right
        {
            const leftBoxDistToRightEdge = img1Width - leftBox.x - leftBox.width;
            const rightBoxDistToRightEdge = img2Width - rightBox.x - rightBox.width;
            const leftBoxDistToBottom = img1Height - leftBox.y - leftBox.height;
            const rightBoxDistToBottom = img2Height - rightBox.y - rightBox.height;
    
            const maxGrowRight = Math.min(leftBoxDistToRightEdge, rightBoxDistToRightEdge, maxWidth - leftBox.width);
            const maxGrowDown = Math.min(leftBoxDistToBottom, rightBoxDistToBottom, maxHeight - leftBox.height);
    
            this.growCorner(leftBox, rightBox, maxGrowRight, maxGrowDown, ratio);
        }

        // Bottom left
        {
            const leftBoxDistToBottom = img1Height - leftBox.y - leftBox.height;
            const rightBoxDistToBottom = img2Height - rightBox.y - rightBox.height;
    
            const maxX = Math.min(leftBox.x, rightBox.x, maxWidth - leftBox.width);
            const maxGrowDown = Math.min(leftBoxDistToBottom, rightBoxDistToBottom, maxHeight - leftBox.height);

            const { xDir } = this.growCorner(leftBox, rightBox, maxX, maxGrowDown, ratio);
            leftBox.x -= xDir;
            rightBox.x -= xDir;
        }

        // Top right
        {
            const leftBoxDistToRightEdge = img1Width - leftBox.x - leftBox.width;
            const rightBoxDistToRightEdge = img2Width - rightBox.x - rightBox.width;

            const maxGrowRight = Math.min(leftBoxDistToRightEdge, rightBoxDistToRightEdge, maxWidth - leftBox.width);
            const maxY = Math.min(leftBox.y, rightBox.y, maxHeight - leftBox.height);

            const { yDir } = this.growCorner(leftBox, rightBox, maxGrowRight, maxY, ratio);
            leftBox.y -= yDir;
            leftBox.yOffset -= yDir;
            rightBox.y -= yDir;
            rightBox.yOffset -= yDir;
        }
    }
}

// ===================================
// CROP RENDERER - Handles drawing of crop interface
// ===================================
class CropRenderer {
    static CROP_BOX_OVERLAY_OPACITY = 0.7;
    static handleSize = CropInteraction.HANDLE_SIZE;
    
    // Glow animation state
    static glowStartTime = 0;
    static GLOW_DURATION = 500;
    static glowAnimationActive = false;
    static glowAnimationFrameId = null;
    
    static drawCropInterface(highlights = [false, false]) {
        // Start glow animation if any box went active
        if (highlights[Box.LEFT] || highlights[Box.RIGHT]) {
            this.startGlowAnimation();
        }
        
        if (CropManager.alignMode) {
            AlignMode.drawAlignInterface();
            return;
        }

        // Get the main canvas context
        const canvas = CropManager.canvas;
        const ctx = CropManager.ctx;

        // Calculate image offsets
        const xOffsets = {
            left: -(CropManager.cropBoxes[Box.LEFT].x + CropManager.cropBoxes[Box.LEFT].width - SIC.images[0].width * CropManager.currentScale),
            right: -CropManager.cropBoxes[Box.RIGHT].x
        };

        const yOffsets = {
            left: -CropManager.cropBoxes[Box.LEFT].yOffset,
            right: -CropManager.cropBoxes[Box.RIGHT].yOffset
        };

        // Draw gap based on crop box size
        const avgWidth = CropManager.cropBoxes[Box.LEFT].width;
        
        // Draw images with both x and y offsets
        CropManager.currentParams = this.renderCroppedImages(
            CropManager.currentScale,
            xOffsets,
            yOffsets,
            avgWidth
        );

        // Calculate image dimensions and positions
        const { img1Width, img1Height, img2Width, img2Height, rightImgStart } = CropManager.currentParams;
        
        // Create boxes in canvas space
        const leftBox = {
            x: CropManager.cropBoxes[Box.LEFT].x + xOffsets.left,
            y: CropManager.cropBoxes[Box.LEFT].y + yOffsets.left,
            width: CropManager.cropBoxes[Box.LEFT].width,
            height: CropManager.cropBoxes[Box.LEFT].height
        };
        
        // For the right box, we need the right image start position
        const rightBox = {
            x: rightImgStart,
            y: CropManager.cropBoxes[Box.RIGHT].y + yOffsets.right,
            width: CropManager.cropBoxes[Box.RIGHT].width,
            height: CropManager.cropBoxes[Box.RIGHT].height
        };

        // Draw semi-transparent overlay for areas outside the crop boxes
        ctx.globalAlpha = this.CROP_BOX_OVERLAY_OPACITY;
        ctx.fillStyle = ImageRenderer.BODY_BG_COLOR;

        // Left image overlay - shade the whole image
        ctx.fillRect(xOffsets.left, yOffsets.left, img1Width - xOffsets.left, img1Height);
        // Right image overlay
        ctx.fillRect(rightBox.x, yOffsets.right, img2Width + xOffsets.right, img2Height);
        ctx.globalAlpha = 1.0;

        // Redraw the cropped part of the left image
        ctx.drawImage(
            SIC.images[0],
            CropManager.cropBoxes[Box.LEFT].x / CropManager.currentScale, 
            CropManager.cropBoxes[Box.LEFT].y / CropManager.currentScale,
            leftBox.width / CropManager.currentScale, 
            leftBox.height / CropManager.currentScale,
            leftBox.x, leftBox.y,
            leftBox.width, leftBox.height
        );

        // Redraw the cropped part of the right image
        ctx.drawImage(
            SIC.images[1],
            CropManager.cropBoxes[Box.RIGHT].x / CropManager.currentScale, 
            CropManager.cropBoxes[Box.RIGHT].y / CropManager.currentScale,
            rightBox.width / CropManager.currentScale, 
            rightBox.height / CropManager.currentScale,
            rightBox.x, rightBox.y,
            rightBox.width, rightBox.height
        );

        const glowParams = this.glowParameters();

        // Draw left crop box
        this.configureBoxStyle(ctx, CropInteraction.movableBoxes[Box.LEFT], glowParams);
        if (CropOptions.drawBoxesCheckbox.checked) {
            this.drawCropBox(ctx, leftBox.x + leftBox.width, leftBox.y, leftBox.x,
                Math.min(canvas.height, leftBox.y + leftBox.height));
        }
        this.drawHandles(ctx, leftBox, Box.LEFT);

        // Draw right crop box
        this.configureBoxStyle(ctx, CropInteraction.movableBoxes[Box.RIGHT], glowParams);
        if (CropOptions.drawBoxesCheckbox.checked) {
            this.drawCropBox(ctx, rightBox.x, rightBox.y,
                Math.min(canvas.width, rightBox.x + rightBox.width),
                Math.min(canvas.height, rightBox.y + rightBox.height));
        }
        this.drawHandles(ctx, rightBox, Box.RIGHT);

        // Reset to defaults
        ctx.lineWidth = 2;
        this.handleSize = CropInteraction.HANDLE_SIZE;
        ctx.globalAlpha = 1.0;

        if (SIC.DEBUG) {
            CropInteraction.drawHandleBoxes(rightImgStart);
        }
    }
    
    static drawCropBox(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1, y2);
        ctx.stroke();
    }

    static renderCroppedImages(renderScale, xOffsets, yOffsets, avgWidth) {
        const images = SIC.images;
        // Get the main canvas context
        const canvas = CropManager.canvas;
        const ctx = CropManager.ctx;

        // Calculate gap spacing
        const renderGap = avgWidth * (UIManager.gapPercent / 100);

        // Calculate dimensions
        const img1Width = images[0].width * renderScale;
        const img2Width = images[1].width * renderScale;
        const rightImgStart = img1Width + renderGap;
        const totalWidth = Math.ceil(rightImgStart + img2Width);

        const img1Height = images[0].height * renderScale;
        const img2Height = images[1].height * renderScale;
        const maxHeight = Math.ceil(Math.max(img1Height + yOffsets.left, img2Height + yOffsets.right));

        // Set canvas dimensions
        canvas.width = totalWidth;
        canvas.height = maxHeight;

        // Crop mode background
        ctx.fillStyle = ImageRenderer.BODY_BG_COLOR;
        ctx.fillRect(0, 0, totalWidth, maxHeight);

        // Fill gap area
        const gapStart = Math.max(yOffsets.left, yOffsets.right);
        const gapHeight = Math.min(img1Height + yOffsets.left, img2Height + yOffsets.right) - gapStart;

        if (UIManager.isTransparent) {
            ctx.clearRect(
                img1Width,
                gapStart,
                renderGap,
                gapHeight
            );
        } else {
            ctx.fillStyle = UIManager.gapColor;
            ctx.fillRect(
                img1Width,
                gapStart,
                renderGap,
                gapHeight
            );
        }

        // Draw left image
        ctx.drawImage(
            images[0],
            0, 0,
            images[0].width - xOffsets.left / renderScale, images[0].height,
            xOffsets.left, yOffsets.left,
            img1Width - xOffsets.left, img1Height
        );

        // Draw right image
        const xFactor = xOffsets.right / renderScale;
        ctx.drawImage(
            images[1],
            -xFactor, 0,
            images[1].width + xFactor, images[1].height,
            rightImgStart, yOffsets.right,
            img2Width + xOffsets.right, img2Height
        );

        // Store render parameters
        const lastRenderParams = {
            img1Width,
            img1Height,
            img2Width,
            img2Height,
            rightImgStart
        };
        
        return lastRenderParams;
    }

    static glowParameters() {
        // Calculate glow intensity if animation is active
        let glowIntensity = 0;
        let glowOffset = 0;
        let greenIntensity = 0; // For color transition

        if (this.glowAnimationActive) {
            const elapsed = performance.now() - this.glowStartTime;
            // Clamp normalizedTime between 0 and 1
            const normalizedTime = Math.min(elapsed / this.GLOW_DURATION, 1);
            
            // Calculate a base intensity value between 0 and 1
            let baseIntensity;
            if (normalizedTime < 0.2) {
                // Fast rise phase (first 20% of time) - quick ramp up to full intensity
                const t = normalizedTime / 0.2;
                // Smoothstep function
                baseIntensity = t * t * (3 - 2 * t);
            } else {
                // Long decay phase (remaining 80% of time) - very gradual falloff
                const t = (normalizedTime - 0.2) / 0.8;
                // Cubic falloff
                baseIntensity = Math.pow(1 - t, 3);
            }
            
            // Apply the appropriate multipliers to the base intensity
            glowIntensity = 30 * baseIntensity;
            glowOffset = 2 * baseIntensity;
            greenIntensity = baseIntensity; // No multiplier needed (0 to 1)
        }

        return [glowIntensity, glowOffset, greenIntensity];
    }
    
    static configureBoxStyle(ctx, isMovable, glowParams) {
        const [glowIntensity, glowOffset, greenIntensity] = glowParams;

        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 2;
        this.handleSize = CropInteraction.HANDLE_SIZE;

        if (CropInteraction.isDragging || CropInteraction.isArrowing) {
            // No animation effects, just a white border
            ctx.strokeStyle = '#ffffff';
        } else if (isMovable) {
            // Green, movable box
            ctx.strokeStyle = '#33cc33';
            if (this.glowAnimationActive) {
                // Set line width with smooth transition
                ctx.lineWidth = 2 + glowOffset;
                this.handleSize = CropInteraction.HANDLE_SIZE + glowOffset;
            }
        } else {
            // Orange, not movable
            ctx.strokeStyle = '#ff8800';
        }
    }
    
    static startGlowAnimation() {
        // Cancel any existing animation
        if (this.glowAnimationFrameId !== null) {
            cancelAnimationFrame(this.glowAnimationFrameId);
        }
        
        this.glowAnimationActive = true;
        this.glowStartTime = performance.now();
        
        // Start the animation loop
        this.glowAnimationFrameId = requestAnimationFrame(() => this.animateGlow());
    }
    
    static animateGlow() {
        const elapsed = performance.now() - this.glowStartTime;

        if (!CropManager.isCropping) {
            // Stop the animation
            this.stopGlowAnimation();
        }
        else if (elapsed < this.GLOW_DURATION && this.glowAnimationActive) {
            // Continue the animation
            this.glowAnimationFrameId = requestAnimationFrame(() => this.animateGlow());
            
            // Call drawCropInterface without activation flags
            this.drawCropInterface();
        } else {
            // Stop the animation
            this.stopGlowAnimation();
            
            // Final render with no glow
            this.drawCropInterface();
        }
    }
    
    static stopGlowAnimation() {
        this.glowAnimationActive = false;
        if (this.glowAnimationFrameId !== null) {
            cancelAnimationFrame(this.glowAnimationFrameId);
            this.glowAnimationFrameId = null;
        }
    }
    
    static drawHandles(ctx, box, boxPos) {
        if (!CropInteraction.resizing && (CropInteraction.isDragging || CropInteraction.isArrowing)) return;

        // Define handle positions
        const cornerRadius = this.handleSize / 4;

        let cornerHandlePositions, sideHandlePositions;
        if (boxPos === Box.LEFT) {
            cornerHandlePositions = [
                { id: Handle.TOP_LEFT, x: box.x, y: box.y, start: 0 },
                { id: Handle.BOTTOM_LEFT, x: box.x, y: box.y + box.height, start: 1.5 * Math.PI },
            ];
            sideHandlePositions = [
                { id: Handle.TOP_MIDDLE, x: box.x + box.width / 2 - this.handleSize, y: box.y,
                    width: this.handleSize * 2, height: this.handleSize / 2,
                    corners: [0, 0, cornerRadius, cornerRadius] },
                { id: Handle.BOTTOM_MIDDLE, x: box.x + box.width / 2 - this.handleSize, y: box.y + box.height - this.handleSize / 2,
                    width: this.handleSize * 2, height: this.handleSize / 2,
                    corners: [cornerRadius, cornerRadius, 0, 0] },
                { id: Handle.LEFT_MIDDLE, x: box.x, y: box.y + box.height / 2 - this.handleSize,
                    width: this.handleSize / 2, height: this.handleSize * 2,
                    corners: [0, cornerRadius, cornerRadius, 0] }
            ];
        } else if (boxPos === Box.RIGHT) {
            cornerHandlePositions = [
                { id: Handle.TOP_RIGHT, x: box.x + box.width, y: box.y, start: 0.5 * Math.PI },
                { id: Handle.BOTTOM_RIGHT, x: box.x + box.width, y: box.y + box.height, start: Math.PI },
            ];
            sideHandlePositions = [
                { id: Handle.TOP_MIDDLE, x: box.x + box.width / 2 - this.handleSize, y: box.y,
                    width: this.handleSize * 2, height: this.handleSize / 2,
                    corners: [0, 0, cornerRadius, cornerRadius] },
                { id: Handle.BOTTOM_MIDDLE, x: box.x + box.width / 2 - this.handleSize, y: box.y + box.height - this.handleSize / 2,
                    width: this.handleSize * 2, height: this.handleSize / 2,
                    corners: [cornerRadius, cornerRadius, 0, 0] },
                { id: Handle.RIGHT_MIDDLE, x: box.x + box.width - this.handleSize / 2, y: box.y + box.height / 2 - this.handleSize,
                    width: this.handleSize / 2, height: this.handleSize * 2,
                    corners: [cornerRadius, 0, 0, cornerRadius] }
            ];
        } else {
            // Align mode
            cornerHandlePositions = [
                { id: Handle.TOP_LEFT, x: box.x, y: box.y, start: 0 },
                { id: Handle.BOTTOM_LEFT, x: box.x, y: box.y + box.height, start: 1.5 * Math.PI },
                { id: Handle.TOP_RIGHT, x: box.x + box.width, y: box.y, start: 0.5 * Math.PI },
                { id: Handle.BOTTOM_RIGHT, x: box.x + box.width, y: box.y + box.height, start: Math.PI },
            ];
            sideHandlePositions = [
                { id: Handle.TOP_MIDDLE, x: box.x + box.width / 2 - this.handleSize, y: box.y,
                    width: this.handleSize * 2, height: this.handleSize / 2,
                    corners: [0, 0, cornerRadius, cornerRadius] },
                { id: Handle.BOTTOM_MIDDLE, x: box.x + box.width / 2 - this.handleSize, y: box.y + box.height - this.handleSize / 2,
                    width: this.handleSize * 2, height: this.handleSize / 2,
                    corners: [cornerRadius, cornerRadius, 0, 0] },
                { id: Handle.LEFT_MIDDLE, x: box.x, y: box.y + box.height / 2 - this.handleSize,
                    width: this.handleSize / 2, height: this.handleSize * 2,
                    corners: [0, cornerRadius, cornerRadius, 0] },
                { id: Handle.RIGHT_MIDDLE, x: box.x + box.width - this.handleSize / 2, y: box.y + box.height / 2 - this.handleSize,
                    width: this.handleSize / 2, height: this.handleSize * 2,
                    corners: [cornerRadius, 0, 0, cornerRadius] }
            ];
        }
    
        // Draw handles
        ctx.fillStyle = ctx.strokeStyle;

        cornerHandlePositions.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.handleSize, pos.start, pos.start + 0.5 * Math.PI);
            ctx.lineTo(pos.x, pos.y);
            ctx.fill();
        });

        sideHandlePositions.forEach(pos => {
            ctx.beginPath();
            ctx.roundRect(
                pos.x,
                pos.y,
                pos.width,
                pos.height,
                pos.corners
            );
            ctx.fill();
        });
    }
}

// ===================================
// CROP VALIDATOR - Debug validation for crop boxes
// ===================================
class CropValidator {
    static validateCropBoxes(msg) {
        if (!SIC.DEBUG) return;
        
        const minCropSizeCanvas = CropBoxHelper.MIN_CROP_SIZE_PIXELS * CropManager.currentScale;
        // Get current image dimensions
        const oldCropBoxes = [
            { ...CropManager.cropBoxes[Box.LEFT] },
            { ...CropManager.cropBoxes[Box.RIGHT] }
        ];
        
        const img1Width = SIC.images[0].width * CropManager.currentScale;
        const img1Height = SIC.images[0].height * CropManager.currentScale;
        const img2Width = SIC.images[1].width * CropManager.currentScale;
        const img2Height = SIC.images[1].height * CropManager.currentScale;
        
        // Ensure left box stays within left image bounds
        CropManager.cropBoxes[Box.LEFT].x = Math.max(0, Math.min(CropManager.cropBoxes[Box.LEFT].x, img1Width - minCropSizeCanvas));
        CropManager.cropBoxes[Box.LEFT].y = Math.max(0, Math.min(CropManager.cropBoxes[Box.LEFT].y, img1Height - minCropSizeCanvas));
        CropManager.cropBoxes[Box.LEFT].width = Math.max(minCropSizeCanvas, Math.min(CropManager.cropBoxes[Box.LEFT].width, img1Width - CropManager.cropBoxes[Box.LEFT].x));
        CropManager.cropBoxes[Box.LEFT].height = Math.max(minCropSizeCanvas, Math.min(CropManager.cropBoxes[Box.LEFT].height, img1Height - CropManager.cropBoxes[Box.LEFT].y));
        
        // Ensure right box stays within right image bounds
        CropManager.cropBoxes[Box.RIGHT].x = Math.max(0, Math.min(CropManager.cropBoxes[Box.RIGHT].x, img2Width - minCropSizeCanvas));
        CropManager.cropBoxes[Box.RIGHT].y = Math.max(0, Math.min(CropManager.cropBoxes[Box.RIGHT].y, img2Height - minCropSizeCanvas));
        CropManager.cropBoxes[Box.RIGHT].width = Math.max(minCropSizeCanvas, Math.min(CropManager.cropBoxes[Box.RIGHT].width, img2Width - CropManager.cropBoxes[Box.RIGHT].x));
        CropManager.cropBoxes[Box.RIGHT].height = Math.max(minCropSizeCanvas, Math.min(CropManager.cropBoxes[Box.RIGHT].height, img2Height - CropManager.cropBoxes[Box.RIGHT].y));
        
        // Enforce both crop boxes having the same height and width
        const minHeight = Math.min(CropManager.cropBoxes[Box.LEFT].height, CropManager.cropBoxes[Box.RIGHT].height);
        const minWidth = Math.min(CropManager.cropBoxes[Box.LEFT].width, CropManager.cropBoxes[Box.RIGHT].width);
        
        CropManager.cropBoxes[Box.LEFT].height = minHeight;
        CropManager.cropBoxes[Box.RIGHT].height = minHeight;
        CropManager.cropBoxes[Box.LEFT].width = minWidth;
        CropManager.cropBoxes[Box.RIGHT].width = minWidth;

        // Check for changes and report
        const eps = CropBoxHelper.epsilon / 100;
        if (
            Math.abs(CropManager.cropBoxes[Box.LEFT].x - oldCropBoxes[Box.LEFT].x) > eps ||
            Math.abs(CropManager.cropBoxes[Box.LEFT].y - oldCropBoxes[Box.LEFT].y) > eps ||
            Math.abs(CropManager.cropBoxes[Box.LEFT].width - oldCropBoxes[Box.LEFT].width) > eps ||
            Math.abs(CropManager.cropBoxes[Box.LEFT].height - oldCropBoxes[Box.LEFT].height) > eps
        ) {
            console.log('Left x, y, width, height:', msg);
            console.log(img1Width, img1Height);
            console.log(CropManager.cropBoxes[Box.LEFT]);
            console.log(oldCropBoxes[Box.LEFT]);
            CropManager.cropBoxes[Box.LEFT] = { ...oldCropBoxes[Box.LEFT] };
        }
        
        if (
            Math.abs(CropManager.cropBoxes[Box.RIGHT].x - oldCropBoxes[Box.RIGHT].x) > eps ||
            Math.abs(CropManager.cropBoxes[Box.RIGHT].y - oldCropBoxes[Box.RIGHT].y) > eps ||
            Math.abs(CropManager.cropBoxes[Box.RIGHT].width - oldCropBoxes[Box.RIGHT].width) > eps ||
            Math.abs(CropManager.cropBoxes[Box.RIGHT].height - oldCropBoxes[Box.RIGHT].height) > eps
        ) {
            console.log('Right: x, y, width, height:', msg);
            console.log(img2Width, img2Height);
            console.log(CropManager.cropBoxes[Box.RIGHT]);
            console.log(oldCropBoxes[Box.RIGHT]);
            CropManager.cropBoxes[Box.RIGHT] = { ...oldCropBoxes[Box.RIGHT] };
        }

        // Check that crop boxes are aligned on screen
        if (Math.abs(CropManager.cropBoxes[Box.LEFT].y - CropManager.cropBoxes[Box.LEFT].yOffset - 
                (CropManager.cropBoxes[Box.RIGHT].y - CropManager.cropBoxes[Box.RIGHT].yOffset)) > CropBoxHelper.epsilon) {
            console.log("y doesn't match:", msg);
            console.log(CropManager.cropBoxes[Box.LEFT].y - CropManager.cropBoxes[Box.LEFT].yOffset - 
                (CropManager.cropBoxes[Box.RIGHT].y - CropManager.cropBoxes[Box.RIGHT].yOffset));
            console.log(CropManager.cropBoxes);
        }
    }
}

// ===================================
// ALIGN MODE - Handles align mode UI and functionality
// ===================================
class AlignMode {
    static savePreviousScalePercent = 0;
    static scalePercent = 0;
    static cropRatio = 0;
    static alignImage0 = null;
    static alignImage1 = null;
    static saveLockedCheckbox = true;
    
    static enter() {
        CropManager.alignMode = true;
        StorageManager.setItem('alignCheckBox', true);
        CropOptions.alignCheckbox.checked = true;
        this.saveLockedCheckbox = CropOptions.lockedCheckbox.checked;
        CropOptions.lockedCheckbox.checked = false;
        CropOptions.lockedCheckbox.disabled = true;
        this.cropRatio = CropManager.cropBoxes[Box.LEFT].width / CropManager.cropBoxes[Box.LEFT].height;

        this.savePreviousScalePercent = CropManager.currentScale / ImageRenderer.maxScale;
        if (this.scalePercent === 0) {
            this.scalePercent = StorageManager.getItem('alignModeScalePercent', this.savePreviousScalePercent);
        }
        
        // We are displaying overlaid images so get the new max scale
        CropManager.updateScalePercent(this.scalePercent, true, false);

        // Adjust crop boxes to new scale
        CropManager.adjustToNewScale();

        CropInteraction.currentHandle = Handle.INSIDE;
        CropInteraction.activeCropBox = Box.LEFT;
        CropInteraction.updateCursor(CropInteraction.currentHandle);
        CropInteraction.movableBoxes = CropInteraction.getMovableBoxes(CropInteraction.currentHandle);
        CropRenderer.drawCropInterface(CropInteraction.movableBoxes);

        // Transform images for easier aligning
        this.alignImage0 = ImageTransformer.transformImage(SIC.images[0], (r, g, b, a, x, y) => {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const inverse = 255 - gray;
            return [inverse, inverse, inverse, a];
        });
        
        this.alignImage1 = ImageTransformer.transformImage(SIC.images[1], (r, g, b, a, x, y) => {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            return [gray, gray, gray, a];
        });
    }
    
    static exit() {
        this.restorePreviousScalePercent();
        CropManager.alignMode = false;
        StorageManager.setItem('alignCheckBox', false);
        CropOptions.alignCheckbox.checked = false;
        CropOptions.lockedCheckbox.disabled = false;
        CropOptions.lockedCheckbox.checked = this.saveLockedCheckbox;

        CropInteraction.currentHandle = Handle.OUTSIDE;
        CropInteraction.activeCropBox = Box.LEFT;
        CropInteraction.updateCursor(CropInteraction.currentHandle);
        CropInteraction.movableBoxes = CropInteraction.getMovableBoxes(CropInteraction.currentHandle);
        CropRenderer.drawCropInterface(CropInteraction.movableBoxes);
    }
    
    static toggle() {
        CropInteraction.onArrowEnd();
        if (CropManager.alignMode) {
            this.exit();
        } else {
            this.enter();
        }
    }
    
    static restorePreviousScalePercent() {
        if (CropManager.alignMode) {
            CropManager.updateScalePercent(this.savePreviousScalePercent, false, false);
            // Adjust crop boxes to new scale
            CropManager.adjustToNewScale();
        }
    }
    
    static drawAlignInterface() {    
        const aligning = CropInteraction.currentHandle === Handle.INSIDE && 
                        (CropInteraction.isDragging || CropInteraction.isArrowing);    

        // Draw images with both x and y offsets
        this.renderAlignModeImages(aligning, CropManager.currentScale);

        // Ensure that both images are not above or below the top of the canvas
        const deltaYOffset = CropAnimation.checkImagePositions();
        if (deltaYOffset !== 0) {
            CropManager.cropBoxes[Box.LEFT].yOffset -= deltaYOffset;
            CropManager.cropBoxes[Box.RIGHT].yOffset -= deltaYOffset;
        }

        // Draw handles etc if not positioning the images relative to each other
        if (!aligning) {
            this.drawCropBoxes();
        }
    }
    
    static drawCropBoxes() {
        // Get the main canvas context
        const canvas = CropManager.canvas;
        const ctx = CropManager.ctx;

        // Draw with right box
        const box = CropManager.cropBoxes[Box.RIGHT];

        // Draw semi-transparent overlay for areas outside the crop box
        ctx.globalAlpha = CropRenderer.CROP_BOX_OVERLAY_OPACITY;
        ctx.fillStyle = ImageRenderer.BODY_BG_COLOR;

        ctx.fillRect(0, 0, box.x, canvas.height);
        ctx.fillRect(box.x, 0, canvas.width - box.x, box.y);
        ctx.fillRect(box.x + box.width, box.y, canvas.width - (box.x + box.width), canvas.height - box.y);
        ctx.fillRect(box.x, box.y + box.height, box.width, canvas.height - (box.y + box.height));

        ctx.globalAlpha = 1.0;

        // Draw the box (optionally) and handles
        const glowParams = CropRenderer.glowParameters();
        CropRenderer.configureBoxStyle(ctx, CropInteraction.movableBoxes[Box.LEFT] || CropInteraction.movableBoxes[Box.RIGHT], glowParams);

        if (CropOptions.drawBoxesCheckbox.checked) {
            ctx.strokeRect(box.x, box.y, box.width, box.height);
        }

        CropRenderer.drawHandles(ctx, box, Box.BOTH);

        // Reset to defaults
        ctx.lineWidth = 2;
        CropRenderer.handleSize = CropInteraction.HANDLE_SIZE;
        ctx.globalAlpha = 1.0;

        if (SIC.DEBUG) {
            CropInteraction.drawHandleBoxes(0);
        }
    }
    
    static renderAlignModeImages(aligning, renderScale) {
        const images = SIC.images;
        // Get the main canvas context
        const canvas = CropManager.canvas;
        const ctx = CropManager.ctx;

        // Calculate dimensions
        const img1Width = images[0].width * renderScale;
        const img2Width = images[1].width * renderScale;
        const maxWidth = Math.ceil(Math.max(img1Width, img2Width));

        const img1Height = images[0].height * renderScale;
        const img2Height = images[1].height * renderScale;
        const maxHeight = Math.ceil(Math.max(img1Height, img2Height));

        // Set canvas dimensions
        canvas.width = maxWidth;
        canvas.height = maxHeight;

        // Clear the canvas
        ctx.fillStyle = ImageRenderer.BODY_BG_COLOR;
        ctx.fillRect(0, 0, maxWidth, maxHeight);

        // Draw the right image
        ctx.drawImage(
            aligning ? this.alignImage1 : images[1],
            0, 0,                                       // Source position
            images[1].width, images[1].height,          // Source dimensions
            0, 0,                                       // Destination position
            img2Width, img2Height                       // Destination dimensions
        );

        const xOffset = (CropManager.cropBoxes[Box.RIGHT].x - CropManager.cropBoxes[Box.LEFT].x);
        const yOffset = (CropManager.cropBoxes[Box.RIGHT].y - CropManager.cropBoxes[Box.LEFT].y);

        ctx.globalAlpha = 0.50;
        // Draw the left image
        ctx.drawImage(
            aligning ? this.alignImage0 : images[0],
            0, 0,                                       // Source position
            images[0].width, images[0].height,          // Source dimensions
            xOffset, yOffset,                           // Destination position with offsets
            img1Width, img1Height                       // Destination dimensions
        );
        ctx.globalAlpha = 1;
    }
}

// ===================================
// CROP ANIMATION - Handles animations for crop interface
// ===================================
class CropAnimation {
    static previousDeltaY = 0;
    static targetDeltaY = 0;
    static animateOffsetChangeStartTime = 0;
    static ANIMATE_OFFSET_CHANGE_DURATION = 300; // milliseconds
    static animateOffsetChangeFrameId = null;
    
    static checkImagePositions() {
        if (CropManager.cropBoxes[Box.LEFT].yOffset < 0 && 
            CropManager.cropBoxes[Box.RIGHT].yOffset < 0) {
            // Both boxes are above the canvas - calculate adjustment to bring one down
            return Math.max(CropManager.cropBoxes[Box.LEFT].yOffset, 
                           CropManager.cropBoxes[Box.RIGHT].yOffset);
        } else if (CropManager.cropBoxes[Box.LEFT].yOffset > 0 && 
                  CropManager.cropBoxes[Box.RIGHT].yOffset > 0) {
            // Both boxes are below the canvas top - calculate adjustment to bring one up
            return Math.min(CropManager.cropBoxes[Box.LEFT].yOffset, 
                           CropManager.cropBoxes[Box.RIGHT].yOffset);
        }
        return 0;
    }
    
    static animateFixImagePositions() {
        const deltaYOffset = this.checkImagePositions();
        // If we need to adjust offsets, animate the change
        if (deltaYOffset !== 0) {
            this.animateOffsetChange(deltaYOffset);
        }
    }
    
    static animateOffsetChange(deltaYOffset) {
        // Cancel any running animation
        if (this.animateOffsetChangeFrameId !== null) {
            cancelAnimationFrame(this.animateOffsetChangeFrameId);
        }

        // Store amount moved so far and target delta
        this.previousDeltaY = 0;
        this.targetDeltaY = deltaYOffset;
        
        // Start animation
        this.animateOffsetChangeStartTime = performance.now();
        this.animateOffsetChangeFrameId = requestAnimationFrame((timestamp) => this.animateOffsetStep(timestamp));
    }
    
    static animateOffsetStep(timestamp) {
        // Calculate progress (0-1)
        const elapsed = timestamp - this.animateOffsetChangeStartTime;
        const progress = Math.min(elapsed / this.ANIMATE_OFFSET_CHANGE_DURATION, 1);
        
        // Use easeOutCubic for smooth deceleration
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Apply the animated offset
        const currentDeltaY = this.targetDeltaY * easeProgress;
        const currentIncrement = currentDeltaY - this.previousDeltaY;
        this.previousDeltaY = currentDeltaY;
        CropManager.cropBoxes[Box.LEFT].yOffset -= currentIncrement;
        CropManager.cropBoxes[Box.RIGHT].yOffset -= currentIncrement;
        CropRenderer.drawCropInterface();
            
        // Continue animation if not complete
        this.animateOffsetChangeFrameId = progress < 1 ? 
            requestAnimationFrame((timestamp) => this.animateOffsetStep(timestamp)) : null;
    }
}

// ===================================
// IMAGE TRANSFORMER - Utility for image transformations
// ===================================
class ImageTransformer {
    static transformImagePixels(imageData, transformFunction) {
        const newImageData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        
        const data = newImageData.data;
        const width = newImageData.width;
        const height = newImageData.height;
        
        for (let y = 0; y < height; y++) {
            const rowIndex = y * width;
            for (let x = 0; x < width; x++) {
                const i = (rowIndex + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                
                const [newR, newG, newB, newA] = transformFunction(r, g, b, a, x, y);
                
                data[i] = newR;
                data[i + 1] = newG;
                data[i + 2] = newB;
                data[i + 3] = newA;
            }
        }
        
        return newImageData;
    }

    static transformImage(imgElement, transformFunction) {
        const canvas = document.createElement('canvas');
        canvas.width = imgElement.naturalWidth || imgElement.width;
        canvas.height = imgElement.naturalHeight || imgElement.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgElement, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const transformedImageData = this.transformImagePixels(imageData, transformFunction);
        
        ctx.putImageData(transformedImageData, 0, 0);
        return canvas;
    }
}

// ===================================
// APPLICATION INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the crop functionality
    CropManager.initialize();
});
