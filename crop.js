// Enhanced crop functionality for Image Combiner
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('canvas');
    
    // Get the control group to insert the crop buttons
    const controlGroups = document.querySelectorAll('.control-group');
    const controlGroup = controlGroups[0]; // First control group with buttons

    // Create crop button and add to controls
    const cropButton = document.createElement('button');
    cropButton.id = 'cropButton';
    cropButton.textContent = 'Crop Images';
    controlGroup.appendChild(cropButton);
    cropButton.disabled = true;
    
    // apply button
    const applyCropButton = document.createElement('button');
    applyCropButton.id = 'applyCrop';
    applyCropButton.textContent = 'Apply Crop';
    applyCropButton.style.display = 'none';
    controlGroup.appendChild(applyCropButton);
    
    // cancel button
    const cancelCropButton = document.createElement('button');
    cancelCropButton.id = 'cancelCrop';
    cancelCropButton.textContent = 'Cancel';
    cancelCropButton.style.display = 'none';
    controlGroup.appendChild(cancelCropButton);
    
    // reset crop button
    const resetCropButton = document.createElement('button');
    resetCropButton.id = 'resetCrop';
    resetCropButton.textContent = 'Reset Crop';
    resetCropButton.style.display = 'none';
    controlGroup.appendChild(resetCropButton);
    
    // Crop state
    let isCropping = false;
    let originalImages = null;
    let tempCroppedImages = null; // Store temporarily during crop operations
    let lastCropState = null;
    let cropBoxes = [
        { x: 0, y: 0, width: 0, height: 0, yOffset: 0 },
        { x: 0, y: 0, width: 0, height: 0, yOffset: 0 }
    ];
    const HANDLE_SIZE = 16;
    const GRAB_SIZE = 3 * HANDLE_SIZE;
    let handleSize = HANDLE_SIZE;

    const MIN_CROP_SIZE_PERCENT = 1 / 8;
    let minCropSizePixels = 0;

    // Original scale before any cropping
    let resetScalePercent = 0;
    // Scale prior to entering crop mode
    let preCropScalePercent = 0;
    
    // Track crop state
    let isDragging = false;
    let isArrowing = false;
    let currentHandle = null;
    let activeCropBox = null;
    let dragStartX = 0;
    let dragStartY = 0;
    
    // Current parameters from main script
    let currentScale = 0.5; // Default 50%
    let currentParams = null;
    
    let alignMode = false;

    // Cropbox names
    // LEFT must be 0, RIGHT must be 1
    const [ LEFT, RIGHT, BOTH ] = [ 0, 1, 2 ];

    // Cropbox handle names
    const [ TOP_LEFT, TOP_MIDDLE, TOP_RIGHT, LEFT_MIDDLE, RIGHT_MIDDLE, BOTTOM_LEFT, BOTTOM_MIDDLE, BOTTOM_RIGHT, INSIDE, OUTSIDE, TRANSLATION ] =
        [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ];

    // Track which boxes can move with current crop boundaries
    let movableBoxes = [ false, false ];

    const DEBUG = false;

    // =========================
    // Event Listeners
    // =========================
    
    cropButton.addEventListener('click', startCrop);
    applyCropButton.addEventListener('click', applyCrop);
    cancelCropButton.addEventListener('click', cancelCrop);
    resetCropButton.addEventListener('click', resetCrop);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch event handlers
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);

    // =========================
    // Functions
    // =========================

    // Touch handlers

    /**
     * Detects if the current device supports touch input
     * Uses multiple detection methods for reliability across browsers
     * @returns {boolean} True if the device supports touch, false otherwise
     */
    function isTouch() {
        // Primary checks for touch support
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            return true;
        }
        
        // Secondary check for Windows Touch devices or special browsers
        if (navigator.msMaxTouchPoints > 0) {
            return true;
        }
        
        // Check for touch via media query (most reliable for modern browsers)
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
            return true;
        }
        
        // Check for touch via pointer media query (Windows-friendly alternative)
        if (window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches) {
            return true;
        }
        
        // Fall back to user agent sniffing as a last resort
        // Less reliable but catches some edge cases
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('android') || 
            userAgent.includes('iphone') || 
            userAgent.includes('ipad') || 
            userAgent.includes('ipod') || 
            userAgent.includes('windows phone')) {
            return true;
        }
        
        // Not a touch device
        return false;
    }

    // Get the x, y position relative to canvas
    function getXY(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return [x, y];
    }

    // clamp translations of crop boxes
    const [ NO_CLAMP, VERTICAL_CLAMP, HORIZONTAL_CLAMP ] = [ 0, 1, 2 ];
    let clampMode = NO_CLAMP;

    // Use in determining primary axis of translation
    let totalDeltaX = 0;
    let totalDeltaY = 0;
    let saveActiveBoxXY = null;
    let saveOtherBoxXY = null;
    let xLatch = 0;
    let yLatch = 0;

    const [ HORIZONTAL, VERTICAL, DIAGONAL, NONE ] = [ 0, 1, 2, 3 ];
    let movementAxis = NONE;

    // area within which the mouse will move slower for fine cropping
    const FINE_CROP_WINDOW_SIZE = 32;
    // Slowest speed for fine movement control
    const SLOWEST_SPEED = 0.20;

    // area of fineCropWindow where only horizontal or vertical movement is allowed
    const latchZoneSize = HANDLE_SIZE / 2;

    // optimization instead of checking currentHandle
    let resizing = false;

    // start mouse or touch drag
    function startDrag(e) {
        isDragging = true;

        // set up for tweakXY
        const [x, y] = getXY(e);
        dragStartX = x;
        dragStartY = y;
        const activeBox = cropBoxes[activeCropBox];
        const otherBox = cropBoxes[1 - activeCropBox];
        saveActiveBoxXY = { x: activeBox.x, y: activeBox.y, yOffset: activeBox.yOffset };
        saveOtherBoxXY = { x: otherBox.x, y: otherBox.y, yOffset: otherBox.yOffset };
        totalDeltaX = 0;
        totalDeltaY = 0;
        xLatch = 0;
        yLatch = 0;
        movementAxis = NONE;

        // check if highlights should be shown and draw crop interface
        const wasMovable = movableBoxes;
        [ currentHandle, activeCropBox ] = getHandle(x, y);
        updateCursor(currentHandle);
        movableBoxes = getMovableBoxes(currentHandle);
        startMove();
        drawCropInterface(movableBoxHighlights(wasMovable));
    }

    // called before moving boxes
    function startMove() {
        resizing = currentHandle !== INSIDE && currentHandle !== OUTSIDE;
        if (alignMode && currentHandle === INSIDE) {
            const activeBox = cropBoxes[activeCropBox];
            const otherBox = cropBoxes[1 - activeCropBox];
            // shrink the boxes so they have room to move around
            shrinkBoxes(activeBox, otherBox);
        }
    }

    function onTouchStart(e) {
        if (!isCropping) return;
        // Prevent default to avoid scrolling/zooming while cropping
        e.preventDefault();
        if (isArrowing) return;
        startDrag(e.touches[0]);
    }

    function onTouchMove(e) {
        if (!isCropping) return;
        // Prevent default to avoid scrolling/zooming while cropping
        e.preventDefault();
        if (!isDragging) return;

        const [x, y] = getXY(e.touches[0]);
        const [deltaX, deltaY, highlights ] = tweakXY(x - dragStartX, y - dragStartY);

        updateCropBoxes(currentHandle, activeCropBox, deltaX, deltaY);
        movableBoxes = getMovableBoxes(currentHandle);
        drawCropInterface(highlights);

        dragStartX = x;
        dragStartY = y;
    }

    function onTouchEnd(e) {
        if (!isCropping) return;
        // Prevent default to avoid scrolling/zooming while cropping
        e.preventDefault();
        if (!isDragging) return;
        isDragging = false;
        clampMode = clampCheckbox.checked ? HORIZONTAL_CLAMP : NO_CLAMP;

        // ensure that both images are not above or below the top of the canvas
        animateFixImagePositions();

        if (alignMode && currentHandle === INSIDE) {
            // grow the boxes as much as possible after shrinking and repositioning them
            growBoxes(cropBoxes[LEFT], cropBoxes[RIGHT]);
        }

        // Update cursor based on handle
        [ currentHandle, activeCropBox ] = [ OUTSIDE, LEFT ];
        updateCursor(currentHandle);
        // check if highlights should be shown and draw crop interface
        const wasMovable = movableBoxes;
        movableBoxes = getMovableBoxes(currentHandle);
        drawCropInterface(movableBoxHighlights(wasMovable));
    }

    function startCrop() {
        // Store current scale before changing it
        preCropScalePercent = window.scale / window.maxScale;

        // Store original images if not already stored
        if (!originalImages) {
            // Save original scale in case we reset the crop while not in crop mode
            resetScalePercent = preCropScalePercent;
            originalImages = [
                window.images[0].cloneNode(true),
                window.images[1].cloneNode(true)
            ];
        } else {
            // For subsequent crops, temporarily restore original images for display
            // but keep the currently cropped images for later restoration in case of a cancel
            tempCroppedImages = [
                window.images[0].cloneNode(true),
                window.images[1].cloneNode(true)
            ];
            
            // Restore original images for display during cropping
            window.images[0] = originalImages[0].cloneNode(true);
            window.images[1] = originalImages[1].cloneNode(true);
        }
        
        isCropping = true;
        isDragging = false;
        isArrowing = false;
        minCropSizePixels = Math.max(16, Math.round(Math.min(images[0].width, images[0].height, images[1].width, images[1].height) * MIN_CROP_SIZE_PERCENT));

        // Show crop controls
        cropButton.style.display = 'none';
        applyCropButton.style.display = 'block';
        cancelCropButton.style.display = 'block';
        cropOptionsControlGroup.style.display = 'block'; // Show crop options in left panel
        window.saveButton.disabled = true;

        // If we have a previous crop state, restore those dimensions
        if (lastCropState) {
            // Set the crop boxes to state while last cropping
            [ cropBoxes[LEFT], cropBoxes[RIGHT] ] = [ { ...lastCropState.boxes[LEFT] }, { ...lastCropState.boxes[RIGHT] } ];

            // restore saveCropBoxDimensions for align mode
            saveCropBoxDimensions = { ...lastCropState.saveCropBoxDimensions };

            // swap if necessary
            if (lastCropState.swapped) {
                swapBoxes(cropBoxes);
            }

            // restore scale
            updateScalePercent(lastCropState.scalePercent);
            // now we've got the scale
            currentScale = window.scale;

            // see if cropBox scale needs to be updated
            if (lastCropState.scale !== currentScale) {
                adjustToNewScale(currentScale / lastCropState.scale);
            }

            if (DEBUG) {
                // Make sure boxes stay in bounds
                validateCropBoxes("startCrop");
            }
        } else {
            currentScale = window.scale;
            initCropBoxes();
        }

        // Draw crop interface
        clampMode = clampCheckbox.checked ? HORIZONTAL_CLAMP : NO_CLAMP;
        if (alignMode) {
            enterAlignMode();
        } else {
            [ currentHandle, activeCropBox ] = [ OUTSIDE, LEFT ];
            updateCursor(currentHandle);
            movableBoxes = getMovableBoxes(currentHandle);
            drawCropInterface(movableBoxes);
        }

    }

    // make sure box dimensions are valid and the same
    if (DEBUG) {
        function validateCropBoxes(msg) {
            const minCropSizeCanvas = minCropSizePixels * currentScale;
            // Get current image dimensions
            const oldCropBoxes = [ { ...cropBoxes[LEFT] },  { ...cropBoxes[RIGHT] } ];
            const img1Width = window.images[0].width * currentScale;
            const img1Height = window.images[0].height * currentScale;
            const img2Width = window.images[1].width * currentScale;
            const img2Height = window.images[1].height * currentScale;
            
            // Ensure left box stays within left image bounds
            cropBoxes[LEFT].x = Math.max(0, Math.min(cropBoxes[LEFT].x, img1Width - minCropSizeCanvas));
            cropBoxes[LEFT].y = Math.max(0, Math.min(cropBoxes[LEFT].y, img1Height - minCropSizeCanvas));
            cropBoxes[LEFT].width = Math.max(minCropSizeCanvas, Math.min(cropBoxes[LEFT].width, img1Width - cropBoxes[LEFT].x));
            cropBoxes[LEFT].height = Math.max(minCropSizeCanvas, Math.min(cropBoxes[LEFT].height, img1Height - cropBoxes[LEFT].y));
            
            // Ensure right box stays within right image bounds - relative to the right image's left edge
            cropBoxes[RIGHT].x = Math.max(0, Math.min(cropBoxes[RIGHT].x, img2Width - minCropSizeCanvas));
            cropBoxes[RIGHT].y = Math.max(0, Math.min(cropBoxes[RIGHT].y, img2Height - minCropSizeCanvas));
            cropBoxes[RIGHT].width = Math.max(minCropSizeCanvas, Math.min(cropBoxes[RIGHT].width, img2Width - cropBoxes[RIGHT].x));
            cropBoxes[RIGHT].height = Math.max(minCropSizeCanvas, Math.min(cropBoxes[RIGHT].height, img2Height - cropBoxes[RIGHT].y));
            
            // Enforce both crop boxes having the same height and width
            const minHeight = Math.min(cropBoxes[LEFT].height, cropBoxes[RIGHT].height);
            const minWidth = Math.min(cropBoxes[LEFT].width, cropBoxes[RIGHT].width);
            
            cropBoxes[LEFT].height = minHeight;
            cropBoxes[RIGHT].height = minHeight;
            cropBoxes[LEFT].width = minWidth;
            cropBoxes[RIGHT].width = minWidth;

            // check for changes and report
            const eps = epsilon / 100;
            if (
                Math.abs(cropBoxes[LEFT].x - oldCropBoxes[LEFT].x) > eps ||
                Math.abs(cropBoxes[LEFT].y - oldCropBoxes[LEFT].y) > eps ||
                Math.abs(cropBoxes[LEFT].width - oldCropBoxes[LEFT].width) > eps ||
                Math.abs(cropBoxes[LEFT].height - oldCropBoxes[LEFT].height) > eps
            ) {
                console.log('Left x, y, width, height:', msg);
                console.log(img1Width, img1Height);
                console.log(cropBoxes[LEFT]);
                console.log(oldCropBoxes[LEFT]);
                cropBoxes[LEFT] = { ...oldCropBoxes[LEFT] };
            }
            if (
                Math.abs(cropBoxes[RIGHT].x - oldCropBoxes[RIGHT].x) > eps ||
                Math.abs(cropBoxes[RIGHT].y - oldCropBoxes[RIGHT].y) > eps ||
                Math.abs(cropBoxes[RIGHT].width - oldCropBoxes[RIGHT].width) > eps ||
                Math.abs(cropBoxes[RIGHT].height - oldCropBoxes[RIGHT].height) > eps
            ) {
                console.log('Right: x, y, width, height:', msg);
                console.log(img2Width, img2Height);
                console.log(cropBoxes[RIGHT]);
                console.log(oldCropBoxes[RIGHT]);
                cropBoxes[RIGHT] = { ...oldCropBoxes[RIGHT] };
            }

            // check that crop boxes are aligned on screen
            if (Math.abs(cropBoxes[LEFT].y - cropBoxes[LEFT].yOffset - (cropBoxes[RIGHT].y - cropBoxes[RIGHT].yOffset)) > epsilon) {
                console.log("y doesn't match:", msg);
                console.log(cropBoxes[LEFT].y - cropBoxes[LEFT].yOffset - (cropBoxes[RIGHT].y - cropBoxes[RIGHT].yOffset));
                console.log(cropBoxes);
            }
        }
    }

    function initCropBoxes() {
        // Get scaled dimensions of images
        const img1Width = window.images[0].width * currentScale;
        const img1Height = window.images[0].height * currentScale;
        const img2Width = window.images[1].width * currentScale;
        const img2Height = window.images[1].height * currentScale;
        
        // Calculate max possible crop size based on smallest image dimensions
        const maxWidth = Math.min(img1Width, img2Width);
        const maxHeight = Math.min(img1Height, img2Height);
        
        // Set initial crop boxes to use the entire available area
        // ensure left crop box's right side is next to gap
        const xGap = img1Width - maxWidth;
        cropBoxes[LEFT] = {
            x: xGap,
            y: 0,
            width: maxWidth,
            height: maxHeight,
            yOffset: 0
        };
        
        // Right crop box - now using coordinates relative to the right image
        cropBoxes[RIGHT] = {
            x: 0, // Start at the left edge of the right image
            y: 0,
            width: maxWidth,
            height: maxHeight,
            yOffset: 0
        };

        // remember the size of the boxes for growing them after positioning them in align mode
        saveCropBoxDimensions = { width: maxWidth, height: maxHeight };
    }
    
    // Get the computed style of the body
    const bodyStyle = window.getComputedStyle(document.body);
    // Get the background-color property
    const bodyBackgroundColor = bodyStyle.backgroundColor;
    // transparency of the image area outside of the cropboxes
    const CROP_BOX_OVERLAY_OPACITY = 0.7;

    // glow state variables
    let glowStartTime = 0;
    const GLOW_DURATION = 500;
    let glowAnimationActive = false;
    let glowAnimationFrameId = null;

    function drawCropInterface(highlights = [ false, false ]) {
        const [ leftBoxHighlight, rightBoxHighlight ] = highlights;
        // Start glow animation if any box went active
        if (leftBoxHighlight || rightBoxHighlight) {
            startGlowAnimation();
        }
        
        if (alignMode) {
            drawCropInterfaceAlignMode();
            return;
        }

        // Get the main canvas context
        const ctx = canvas.getContext('2d');

        // Calculate image offsets
        const xOffsets = {
            left: -(cropBoxes[LEFT].x + cropBoxes[LEFT].width - window.images[0].width * currentScale),
            right: -cropBoxes[RIGHT].x
        };

        // // Initial attempt to do away with yOffsets
        // let yOffsets;
        // if (cropBoxes[LEFT].y > cropBoxes[RIGHT].y) {
        //     yOffsets = {
        //         left: 0,
        //         right: cropBoxes[LEFT].y - cropBoxes[RIGHT].y
        //     };
        // } else {
        //     yOffsets = {
        //         left: cropBoxes[RIGHT].y - cropBoxes[LEFT].y,
        //         right: 0
        //     };
        // }
        const yOffsets = {
            left: -cropBoxes[LEFT].yOffset,
            right: -cropBoxes[RIGHT].yOffset
        };

        // draw gap based on crop box size
        const avgWidth = (cropBoxes[LEFT].width + cropBoxes[RIGHT].width)/2;
        
        // Draw images with both x and y offsets
        currentParams = window.drawImages({
            xOffsets,
            yOffsets,
            avgWidth: avgWidth
        });

        // Calculate image dimensions and positions
        const { img1Width, img1Height, img2Width, img2Height, rightImgStart } = currentParams;
        
        // create boxes in canvas space
        const leftBox = {
            x: cropBoxes[LEFT].x + xOffsets.left,
            y: cropBoxes[LEFT].y + yOffsets.left,
            width: cropBoxes[LEFT].width,
            height: cropBoxes[LEFT].height
        };
        // For the right box, we need the right image start position
        const rightBox = {
            x: rightImgStart,
            y: cropBoxes[RIGHT].y + yOffsets.right,
            width: cropBoxes[RIGHT].width,
            height: cropBoxes[RIGHT].height
        };

        // Draw semi-transparent overlay for areas outside the crop boxes
        ctx.globalAlpha = CROP_BOX_OVERLAY_OPACITY;
        ctx.fillStyle = bodyBackgroundColor;

        // Left image overlay
        // shade the whole image
        ctx.fillRect(xOffsets.left, yOffsets.left, img1Width - xOffsets.left, img1Height);
        // Right image overlay
        ctx.fillRect(rightBox.x, yOffsets.right, img2Width + xOffsets.right, img2Height);
        ctx.globalAlpha = 1.0;

        // redraw the cropped part of the left image
        ctx.drawImage(
            window.images[0],
            cropBoxes[LEFT].x / currentScale, cropBoxes[LEFT].y / currentScale,     // Source position
            leftBox.width / currentScale, leftBox.height / currentScale,            // Source dimensions
            leftBox.x, leftBox.y,                                                   // Destination position with offsets
            leftBox.width, leftBox.height                                           // Destination dimensions
        );

        // redraw the cropped part of the right image
        ctx.drawImage(
            window.images[1],
            cropBoxes[RIGHT].x / currentScale, cropBoxes[RIGHT].y / currentScale,     // Source position using relative coordinates
            rightBox.width / currentScale, rightBox.height / currentScale,            // Source dimensions
            rightBox.x, rightBox.y,                                                   // Destination position with offsets
            rightBox.width, rightBox.height                                           // Destination dimensions
        );

        const glowParams = glowParameters();

        // Draw left crop box
        configureBoxStyle(ctx, movableBoxes[LEFT], glowParams);
        if (drawBoxesCheckbox.checked) {
            drawCropBox(ctx, leftBox.x + leftBox.width, leftBox.y, leftBox.x,
                Math.min(canvas.height, leftBox.y + leftBox.height));
        }
        drawHandles(ctx, leftBox, LEFT);

        // Draw right crop box
        configureBoxStyle(ctx, movableBoxes[RIGHT], glowParams);
        if (drawBoxesCheckbox.checked) {
            drawCropBox(ctx, rightBox.x, rightBox.y,
                Math.min(canvas.width, rightBox.x + rightBox.width),
                Math.min(canvas.height, rightBox.y + rightBox.height));
        }
        drawHandles(ctx, rightBox, RIGHT);

        // Reset to defaults
        // ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        handleSize = HANDLE_SIZE;
        ctx.globalAlpha = 1.0;

        if (DEBUG) {
            // draw the touch points
            getHandle(rightImgStart, 0);
        }
    }

    function drawCropBox(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1, y2);
        ctx.stroke();
    }

    // calculate glow parameters
    function glowParameters() {
        // Calculate glow intensity if animation is active
        let glowIntensity = 0;
        let glowOffset = 0;
        let greenIntensity = 0; // For color transition

        if (glowAnimationActive) {
            const elapsed = performance.now() - glowStartTime;
            // Clamp normalizedTime between 0 and 1
            const normalizedTime = Math.min(elapsed / GLOW_DURATION, 1);
            
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

        return [ glowIntensity, glowOffset, greenIntensity ];
    }

    // configure box borders
    function configureBoxStyle(ctx, isMovable, glowParams) {
        const [ glowIntensity, glowOffset, greenIntensity ] = glowParams;

        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 2;
        handleSize = HANDLE_SIZE;

        if (isDragging || isArrowing) {
            // No animation effects, just a white border
            ctx.strokeStyle = '#ffffff';

        } else if (isMovable) {
            // Green, movable box
            ctx.strokeStyle = '#33cc33';
            if (glowAnimationActive) {
                // Set line width with smooth transition
                ctx.lineWidth = 2 + glowOffset;
                handleSize = HANDLE_SIZE + glowOffset;
            }

        } else {
            // Orange, not movable
            ctx.strokeStyle = '#ff8800';
        }
    }

    // Helper function to start the glow animation
    function startGlowAnimation() {
        // Cancel any existing animation
        if (glowAnimationFrameId !== null) {
            cancelAnimationFrame(glowAnimationFrameId);
        }
        
        glowAnimationActive = true;
        glowStartTime = performance.now();
        
        // Start the animation loop
        glowAnimationFrameId = requestAnimationFrame(animateGlow);
    }

    // Animation loop function - separate from drawCropInterface
    function animateGlow() {
        const elapsed = performance.now() - glowStartTime;

        if (!isCropping) {
            // Stop the animation
            stopGlowAnimation();
        }
        else if (elapsed < GLOW_DURATION && glowAnimationActive) {
            // Continue the animation
            glowAnimationFrameId = requestAnimationFrame(animateGlow);
            
            // Call drawCropInterface without activation flags
            drawCropInterface();
        } else {
            // Stop the animation
            stopGlowAnimation();
            
            // Final render with no glow
            drawCropInterface();
        }
    }

    // Helper function to stop the glow animation
    function stopGlowAnimation() {
        glowAnimationActive = false;
        if (glowAnimationFrameId !== null) {
            cancelAnimationFrame(glowAnimationFrameId);
            glowAnimationFrameId = null;
        }
    }

    function drawHandles(ctx, box, boxPos) {
        if (!resizing && (isDragging || isArrowing)) return;

        // Define handle positions
        const cornerRadius = handleSize / 4;

        let cornerHandlePositions, sideHandlePositions;
        if (boxPos === LEFT) {
            cornerHandlePositions = [
                { id: TOP_LEFT, x: box.x, y: box.y, start: 0 },
                { id: BOTTOM_LEFT, x: box.x, y: box.y + box.height, start: 1.5 * Math.PI },
            ];
            sideHandlePositions = [
                { id: TOP_MIDDLE, x: box.x + box.width / 2 - handleSize, y: box.y,
                    width: handleSize * 2, height: handleSize / 2,
                    corners: [ 0, 0, cornerRadius, cornerRadius ] },
                { id: BOTTOM_MIDDLE, x: box.x + box.width / 2 - handleSize, y: box.y + box.height - handleSize / 2,
                    width: handleSize * 2, height: handleSize / 2,
                    corners: [ cornerRadius, cornerRadius, 0, 0 ] },
                { id: LEFT_MIDDLE, x: box.x, y: box.y + box.height / 2 - handleSize,
                    width: handleSize / 2, height: handleSize * 2,
                    corners: [ 0, cornerRadius, cornerRadius, 0 ] }
            ];
        } else if (boxPos === RIGHT) {
            cornerHandlePositions = [
                { id: TOP_RIGHT, x: box.x + box.width, y: box.y, start: 0.5 * Math.PI },
                { id: BOTTOM_RIGHT, x: box.x + box.width, y: box.y + box.height, start: Math.PI },
            ];
            sideHandlePositions = [
                { id: TOP_MIDDLE, x: box.x + box.width / 2 - handleSize, y: box.y,
                    width: handleSize * 2, height: handleSize / 2,
                    corners: [ 0, 0, cornerRadius, cornerRadius ] },
                { id: BOTTOM_MIDDLE, x: box.x + box.width / 2 - handleSize, y: box.y + box.height - handleSize / 2,
                    width: handleSize * 2, height: handleSize / 2,
                    corners: [ cornerRadius, cornerRadius, 0, 0 ] },
                { id: RIGHT_MIDDLE, x: box.x + box.width - handleSize / 2, y: box.y + box.height / 2 - handleSize,
                    width: handleSize / 2, height: handleSize * 2,
                    corners: [ cornerRadius, 0, 0, cornerRadius ] }
            ];
        } else {
            // align mode
            cornerHandlePositions = [
                { id: TOP_LEFT, x: box.x, y: box.y, start: 0 },
                { id: BOTTOM_LEFT, x: box.x, y: box.y + box.height, start: 1.5 * Math.PI },
                { id: TOP_RIGHT, x: box.x + box.width, y: box.y, start: 0.5 * Math.PI },
                { id: BOTTOM_RIGHT, x: box.x + box.width, y: box.y + box.height, start: Math.PI },
            ];
            sideHandlePositions = [
                { id: TOP_MIDDLE, x: box.x + box.width / 2 - handleSize, y: box.y,
                    width: handleSize * 2, height: handleSize / 2,
                    corners: [ 0, 0, cornerRadius, cornerRadius ] },
                { id: BOTTOM_MIDDLE, x: box.x + box.width / 2 - handleSize, y: box.y + box.height - handleSize / 2,
                    width: handleSize * 2, height: handleSize / 2,
                    corners: [ cornerRadius, cornerRadius, 0, 0 ] },
                { id: LEFT_MIDDLE, x: box.x, y: box.y + box.height / 2 - handleSize,
                    width: handleSize / 2, height: handleSize * 2,
                    corners: [ 0, cornerRadius, cornerRadius, 0 ] },
                { id: RIGHT_MIDDLE, x: box.x + box.width - handleSize / 2, y: box.y + box.height / 2 - handleSize,
                    width: handleSize / 2, height: handleSize * 2,
                    corners: [ cornerRadius, 0, 0, cornerRadius ] }
                ];
        }
    
        // Draw handles
        ctx.fillStyle = ctx.strokeStyle;

        cornerHandlePositions.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, handleSize, pos.start, pos.start + 0.5 * Math.PI );
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

    function getHandle(x, y) {
        if (alignMode) {
            const bothHandle = getHandleForBox(cropBoxes[RIGHT], x, y, BOTH, cropBoxes[RIGHT].x);
            if (bothHandle !== null) {
                return bothHandle.id === INSIDE ? [ INSIDE, LEFT ] : [ bothHandle.id, bothHandle.box ];
            }
            return [ OUTSIDE, LEFT ];
        }

        // Check if the mouse is over any handle of the left crop box
        const xCanvasLeft = currentParams.img1Width - cropBoxes[LEFT].width;
        const leftHandle = getHandleForBox(cropBoxes[LEFT], x, y, LEFT, xCanvasLeft);
        if (leftHandle !== null) {
            return [ leftHandle.id, LEFT ];
        }
        
        // Check if the mouse is over any handle of the right crop box
        // Pass the rightImgStart offset for the right box
        const xCanvasRight = currentParams.rightImgStart;
        const rightHandle = getHandleForBox(cropBoxes[RIGHT], x, y, RIGHT, xCanvasRight);
        if (rightHandle !== null) {
            return [ rightHandle.id, RIGHT ];
        }
        
        return [ OUTSIDE, LEFT ];
    }

    function getHandleForBox(box, x, y, boxPos, xCanvas) {
        // Apply the offset for right box to get canvas coordinates
        const grabSize = Math.min(GRAB_SIZE, (Math.min(box.width, box.height) + 2 * handleSize) / 3);

        // Handle positions
        const middlePosX = xCanvas + (box.width - grabSize) / 2;
        const yCanvas = box.y - (boxPos === BOTH ? 0 : box.yOffset);
        const topPosY = yCanvas - handleSize;
        const middlePosY = yCanvas + (box.height - grabSize) / 2;
        const bottomPosY = yCanvas + box.height - grabSize + handleSize;
        let handlePositions;
        if (boxPos === LEFT) {
            const leftPosX = xCanvas - handleSize;
            handlePositions = [
                { id: TOP_LEFT, x: leftPosX, y: topPosY },
                { id: BOTTOM_LEFT, x: leftPosX, y: bottomPosY },
                // Side handles
                { id: TOP_MIDDLE, x: middlePosX, y: topPosY },
                { id: BOTTOM_MIDDLE, x: middlePosX, y: bottomPosY },
                { id: LEFT_MIDDLE, x: leftPosX, y: middlePosY }
            ];
        } else if (boxPos === RIGHT) {
            const rightPosX = xCanvas + box.width - grabSize + handleSize;
            handlePositions = [
                { id: TOP_RIGHT, x: rightPosX, y: topPosY },
                { id: BOTTOM_RIGHT, x: rightPosX, y: bottomPosY },
                // Side handles
                { id: TOP_MIDDLE, x: middlePosX, y: topPosY },
                { id: BOTTOM_MIDDLE, x: middlePosX, y: bottomPosY },
                { id: RIGHT_MIDDLE, x: rightPosX, y: middlePosY },
            ];
        } else {
            // alignMode, need to return correct box for handle
            const leftPosX = xCanvas - handleSize;
            const rightPosX = xCanvas + box.width - grabSize + handleSize;
            handlePositions = [
                { id: TOP_LEFT, x: leftPosX, y: topPosY, box: LEFT },
                { id: BOTTOM_LEFT, x: leftPosX, y: bottomPosY, box: LEFT },
                { id: TOP_RIGHT, x: rightPosX, y: topPosY, box: RIGHT },
                { id: BOTTOM_RIGHT, x: rightPosX, y: bottomPosY, box: RIGHT },
                // Side handles
                { id: TOP_MIDDLE, x: middlePosX, y: topPosY, box: LEFT },
                { id: BOTTOM_MIDDLE, x: middlePosX, y: bottomPosY, box: LEFT },
                { id: LEFT_MIDDLE, x: leftPosX, y: middlePosY, box: LEFT },
                { id: RIGHT_MIDDLE, x: rightPosX, y: middlePosY, box: RIGHT }
            ];
        }

        if (DEBUG) {
            const ctx = canvas.getContext('2d');
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#33ccff'
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
        if (x >= xCanvas && x <= xCanvas + box.width &&
            y >= yCanvas && y <= yCanvas + box.height) {
            return { id: INSIDE };
        }

        return null;
    }
    
    function updateCursor(handle) {
        switch (handle) {
            case TOP_LEFT:
            case BOTTOM_RIGHT:
                canvas.style.cursor = 'nwse-resize';
                break;
            case TOP_RIGHT:
            case BOTTOM_LEFT:
                canvas.style.cursor = 'nesw-resize';
                break;
            case TOP_MIDDLE:
            case BOTTOM_MIDDLE:
                canvas.style.cursor = 'ns-resize';
                break;
            case LEFT_MIDDLE:
            case RIGHT_MIDDLE:
                canvas.style.cursor = 'ew-resize';
                break;
            case TRANSLATION:
            case INSIDE:
            case OUTSIDE:
                if (clampMode === HORIZONTAL_CLAMP) {
                    canvas.style.cursor = 'ew-resize';
                } else if (clampMode === VERTICAL_CLAMP) {
                    canvas.style.cursor = 'ns-resize';
                } else {
                    canvas.style.cursor = 'move';
                }
                break;
            default:
                canvas.style.cursor = 'default';
        }
        if (isDragging) {
            document.documentElement.style.cursor = canvas.style.cursor;
        } else {
            document.documentElement.style.cursor = 'default';
        }
    }

    function onMouseDown(e) {
        if (!isCropping || isArrowing) return;
        startDrag(e);
    }

    function onMouseMove(e) {
        if (!isCropping || isArrowing) return;

        const [x, y] = getXY(e);

        if (!isDragging) {
            // Update cursor based on handle
            [ currentHandle, activeCropBox ] = getHandle(x, y);
            updateCursor(currentHandle);

            // check if highlights should be shown and draw crop interface
            const wasMovable = movableBoxes;
            movableBoxes = getMovableBoxes(currentHandle);
            drawCropInterface(movableBoxHighlights(wasMovable));
        } else {
            const [deltaX, deltaY, highlights ] = tweakXY(x - dragStartX, y - dragStartY);
            updateCropBoxes(currentHandle, activeCropBox, deltaX, deltaY);
            movableBoxes = getMovableBoxes(currentHandle);
            drawCropInterface(highlights);

            if (DEBUG && movementAxis === NONE && !resizing) {
                const ctx = canvas.getContext('2d');
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ff88ff'
                ctx.strokeRect(x - totalDeltaX - latchZoneSize, y - totalDeltaY - latchZoneSize, latchZoneSize * 2, latchZoneSize * 2);
                ctx.strokeStyle = '#4488ff'
                ctx.strokeRect(x - totalDeltaX - FINE_CROP_WINDOW_SIZE, y - totalDeltaY - FINE_CROP_WINDOW_SIZE, FINE_CROP_WINDOW_SIZE * 2, FINE_CROP_WINDOW_SIZE * 2);
            }
        }
        dragStartX = x;
        dragStartY = y;
    }

    // tweak deltaX and deltaY for fine movement control and direction of translation
    function tweakXY(deltaX, deltaY) {
        // Calculate total movement so far
        totalDeltaX += deltaX;
        totalDeltaY += deltaY;
        let absTotalDeltaX = Math.abs(totalDeltaX);
        let absTotalDeltaY = Math.abs(totalDeltaY);
        if (absTotalDeltaX > latchZoneSize) {
            xLatch = latchZoneSize;
        } else if (absTotalDeltaX < xLatch) {
            absTotalDeltaX = xLatch;
        }
        if (absTotalDeltaY > latchZoneSize) {
            yLatch = latchZoneSize;
        } else if (absTotalDeltaY < yLatch) {
            absTotalDeltaY = yLatch;
        }
        const totalDistanceSquared = absTotalDeltaX * absTotalDeltaX + absTotalDeltaY * absTotalDeltaY;

        // apply fine movement control
        const speedFactor = Math.max(SLOWEST_SPEED, Math.min(1, totalDistanceSquared / (FINE_CROP_WINDOW_SIZE * FINE_CROP_WINDOW_SIZE)));
        xMove = deltaX * speedFactor;
        yMove = deltaY * speedFactor;

        // we're done here if resizing or aligning...
        let highlights = [ false, false ];
        if (resizing || (alignMode && !clampCheckbox.checked && currentHandle === INSIDE)) {
            return [ xMove, yMove, highlights ];
        }

        // update yMove and xMove based on direction of translation
        if (movementAxis === NONE) {
            const inLatchZone = xLatch === 0 || yLatch === 0;
            const otherBox = 1 - activeCropBox;
            if (clampCheckbox.checked) {
                movementAxis = HORIZONTAL;
                clampMode = HORIZONTAL_CLAMP;
                yMove = 0;
            } else if (totalDistanceSquared > FINE_CROP_WINDOW_SIZE * FINE_CROP_WINDOW_SIZE) {
                // We have our direction!  Let the user know...
                highlights[activeCropBox] = true;
                if (! inLatchZone) {
                    movementAxis = DIAGONAL;
                    clampMode = NO_CLAMP;
                } else if (absTotalDeltaX > absTotalDeltaY) {
                    movementAxis = HORIZONTAL;
                    clampMode = HORIZONTAL_CLAMP;
                    yMove = 0;
                    // zero out the vertical direction
                    cropBoxes[activeCropBox].y = saveActiveBoxXY.y;
                    cropBoxes[activeCropBox].yOffset = saveActiveBoxXY.yOffset;
                    cropBoxes[otherBox].y = saveOtherBoxXY.y;
                    cropBoxes[otherBox].yOffset = saveOtherBoxXY.yOffset;
                } else {
                    movementAxis = VERTICAL;
                    clampMode = VERTICAL_CLAMP;
                    xMove = 0;
                    // zero out the horizontal direction
                    cropBoxes[activeCropBox].x = saveActiveBoxXY.x;
                    cropBoxes[otherBox].x = saveOtherBoxXY.x;
                }
            // Still deciding on direction
            } else if (! inLatchZone) {
                if (absTotalDeltaX > absTotalDeltaY) {
                    yLatch = 0;
                } else {
                    xLatch = 0;
                }
                clampMode = NO_CLAMP;
            } else if (absTotalDeltaX > absTotalDeltaY) {
                clampMode = HORIZONTAL_CLAMP;
                yMove = 0;
                cropBoxes[activeCropBox].y = saveActiveBoxXY.y;
                cropBoxes[activeCropBox].yOffset = saveActiveBoxXY.yOffset;
                cropBoxes[otherBox].y = saveOtherBoxXY.y;
                cropBoxes[otherBox].yOffset = saveOtherBoxXY.yOffset;
                yLatch = 0;
            } else {
                clampMode = VERTICAL_CLAMP;
                xMove = 0;
                cropBoxes[activeCropBox].x = saveActiveBoxXY.x;
                cropBoxes[otherBox].x = saveOtherBoxXY.x;
                xLatch = 0;
            }
            updateCursor(TRANSLATION);
        } else if (movementAxis === HORIZONTAL) {
            yMove = 0;
        } else if (movementAxis === VERTICAL) {
            xMove = 0;
        }

        return [ xMove, yMove, highlights ];
    }

    function onMouseUp(e) {
        if (isCropping && isDragging) {
            isDragging = false;
            clampMode = clampCheckbox.checked ? HORIZONTAL_CLAMP : NO_CLAMP;

            // ensure that both images are not above or below the top of the canvas
            animateFixImagePositions();

            if (alignMode && currentHandle === INSIDE) {
                // grow the boxes as much as possible after shrinking and repositioning them
                growBoxes(cropBoxes[LEFT], cropBoxes[RIGHT]);
            }

            // update cursor and cropbox movable state
            onMouseMove(e);
        }
    }

    // Animation variables
    let animateOffsetChangeStartTime = 0;
    const ANIMATE_OFFSET_CHANGE_DURATION = 300; // milliseconds
    let animateOffsetChangeFrameId = null;
    let previousDeltaY = 0;
    let targetDeltaY = 0;

    // Function to animate offset changes
    function animateOffsetChange(deltaYOffset) {
        // Cancel any running animation
        if (animateOffsetChangeFrameId !== null) {
            cancelAnimationFrame(animateOffsetChangeFrameId);
        }

        // Store amount moved so far and target delta
        previousDeltaY = 0;
        targetDeltaY = deltaYOffset;
        
        // Start animation
        animateOffsetChangeStartTime = performance.now();
        animateOffsetChangeFrameId = requestAnimationFrame(animateOffsetStep);
    }

    // Animation step function
    function animateOffsetStep(timestamp) {
        // Calculate progress (0-1)
        const elapsed = timestamp - animateOffsetChangeStartTime;
        const progress = Math.min(elapsed / ANIMATE_OFFSET_CHANGE_DURATION, 1);
        
        // Use easeOutCubic for smooth deceleration
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Apply the animated offset
        const currentDeltaY = targetDeltaY * easeProgress;
        const currentIncrement = currentDeltaY - previousDeltaY;
        previousDeltaY = currentDeltaY;
        cropBoxes[LEFT].yOffset -= currentIncrement;
        cropBoxes[RIGHT].yOffset -= currentIncrement;
            
        // Continue animation if not complete
        if (progress < 1) {
            // Redraw with the new offsets
            drawCropInterface();
            animateOffsetChangeFrameId = requestAnimationFrame(animateOffsetStep);
        } else {
            const wasMovable = movableBoxes;
            movableBoxes = getMovableBoxes(currentHandle);
            drawCropInterface(movableBoxHighlights(wasMovable));
            animateOffsetChangeFrameId = null;
        }
    }

    function getMovableBoxes(handle) {
        if (handle === INSIDE || handle === OUTSIDE) {
            // For moves, we need to check if boxes can actually move
            const leftCanMove = canBoxMove(cropBoxes[LEFT], LEFT);
            const rightCanMove = canBoxMove(cropBoxes[RIGHT], RIGHT);
    
            // Determine which directions are valid based on current clamp mode
            const canMoveHorizontal = clampMode !== VERTICAL_CLAMP;  // Can move horizontally in HORIZONTAL or NO_CLAMP modes
            const canMoveVertical = clampMode !== HORIZONTAL_CLAMP;  // Can move vertically in VERTICAL or NO_CLAMP modes
    
            // Check if the boxes can move within the constraints of the current clamp mode
            const leftCanMoveWithinClamp = (
                (canMoveHorizontal && (leftCanMove.canMoveLeft || leftCanMove.canMoveRight)) ||
                (canMoveVertical && (leftCanMove.canMoveUp || leftCanMove.canMoveDown))
            );
            
            const rightCanMoveWithinClamp = (
                (canMoveHorizontal && (rightCanMove.canMoveLeft || rightCanMove.canMoveRight)) ||
                (canMoveVertical && (rightCanMove.canMoveUp || rightCanMove.canMoveDown))
            );
    
            if (handle === INSIDE) {
                // Check if the active box can move within current clamp constraints
                // In align mode, movement is allowed if either cropbox can move
                if (alignMode) {
                    return [ leftCanMoveWithinClamp, rightCanMoveWithinClamp ];
                } else if (activeCropBox === LEFT) {
                    return [ leftCanMoveWithinClamp, false ];
                } else {
                    return [ false, rightCanMoveWithinClamp ];
                }
            } else if (handle === OUTSIDE) {
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

                return [ bothCanMove, bothCanMove ];
            }
        } else {
            // For resize operations, both boxes are always movable
            // No need to check movement capability for resize operations
            return [ true, true ];
        }
    }

    // Detect which crop boxes should have glowing highlights
    function movableBoxHighlights(wasMovable) {
        const changeToMovableBoxes = movableBoxes[LEFT] !== wasMovable[LEFT] || movableBoxes[RIGHT] !== wasMovable[RIGHT];
        const leftBoxHighlight = (movableBoxes[LEFT] && changeToMovableBoxes);
        const rightBoxHighlight = (movableBoxes[RIGHT] && changeToMovableBoxes);
        return [ leftBoxHighlight, rightBoxHighlight ];
    }

    function updateCropBoxes(handle, activeBox, deltaX, deltaY) {
        const img1Width = window.images[0].width * currentScale;
        const img1Height = window.images[0].height * currentScale;
        const img2Width = window.images[1].width * currentScale;
        const img2Height = window.images[1].height * currentScale;
        
        // The other box
        const otherBox = 1 - activeBox;
        
        // Create copies to simulate changes without affecting the actual boxes yet
        const testActiveBox = { ...cropBoxes[activeBox] };
        
        if (handle === OUTSIDE) {
            // In align mode, we're moving the crop boxes, not the image
            if (alignMode) {
                deltaX = -deltaX;
                deltaY = -deltaY;
            }
            // If moving both boxes, enforce limits of both boxes
            const activeResult = moveBox(testActiveBox, deltaX, deltaY, 
                    activeBox === LEFT ? img1Width : img2Width,
                    activeBox === LEFT ? img1Height : img2Height);

            // Now try moving the other box by the same actual deltas
            const otherResult = moveBox(cropBoxes[otherBox], activeResult.x, activeResult.y, 
                    otherBox === LEFT ? img1Width : img2Width,
                    otherBox === LEFT ? img1Height : img2Height);

            // Apply (possibly constrained) changes to activeBox
            moveBox(cropBoxes[activeBox], otherResult.x, otherResult.y, 
                activeBox === LEFT ? img1Width : img2Width,
                activeBox === LEFT ? img1Height : img2Height);

        } else if (handle === INSIDE) {
            // Only move the active box
            const { x, y } =
                moveBox(cropBoxes[activeBox], deltaX, deltaY, 
                    activeBox === LEFT ? img1Width : img2Width,
                    activeBox === LEFT ? img1Height : img2Height);
            // in alignMode, move the other box when the active one can't move
            if (alignMode) {
                moveBox(cropBoxes[otherBox], x - deltaX, y - deltaY, 
                    otherBox === LEFT ? img1Width : img2Width,
                    otherBox === LEFT ? img1Height : img2Height);    
            }
        } else {
            // Resize operation
            // Store the original dimensions
            const originalActiveWidth = testActiveBox.width;
            const originalActiveHeight = testActiveBox.height;
            const originalActiveX = testActiveBox.x;
            const originalActiveY = testActiveBox.y;

            // Simulate update on the test active box
            resizeBox(testActiveBox, handle, deltaX, deltaY, 
                            activeBox === LEFT ? img1Width : img2Width,
                            activeBox === LEFT ? img1Height : img2Height);
            
            // Calculate changes in dimensions and position
            const widthChange = testActiveBox.width - originalActiveWidth;
            const heightChange = testActiveBox.height - originalActiveHeight;
            const xChange = testActiveBox.x - originalActiveX;
            const yChange = testActiveBox.y - originalActiveY;
            
            // Apply the same type of changes to the test other box
            const testOtherBox = { ...cropBoxes[otherBox] };
            
            // Handle x position changes (left edge)
            if ([TOP_LEFT, LEFT_MIDDLE, BOTTOM_LEFT].includes(handle)) {
                testOtherBox.x += xChange;
                testOtherBox.width -= xChange; // Compensate width for left edge movement
            }
            
            // Handle y position changes (top edge)
            if ([TOP_LEFT, TOP_MIDDLE, TOP_RIGHT].includes(handle)) {
                testOtherBox.y += yChange;
                testOtherBox.height -= yChange; // Compensate height for top edge movement
            }
            
            // Handle width changes (right edge)
            if ([TOP_RIGHT, RIGHT_MIDDLE, BOTTOM_RIGHT].includes(handle)) {
                testOtherBox.width += widthChange;
            }
            
            // Handle height changes (bottom edge)
            if ([BOTTOM_LEFT, BOTTOM_MIDDLE, BOTTOM_RIGHT].includes(handle)) {
                testOtherBox.height += heightChange;
            }
            
            // Check if both test boxes would be valid after the resize
            if (!isBoxInBounds(testActiveBox,
                              activeBox === LEFT ? img1Width : img2Width,
                              activeBox === LEFT ? img1Height : img2Height) ||
                !isBoxInBounds(testOtherBox,
                              otherBox === LEFT ? img1Width : img2Width,
                              otherBox === LEFT ? img1Height : img2Height)) {
                // If either box would be out of bounds, don't allow the resize
                return;
            }

            // If we reach here, the resize is valid for both boxes
            // Apply the changes to the real boxes
            cropBoxes[activeBox] = testActiveBox;
            cropBoxes[otherBox] = testOtherBox;

            // remember the size of the boxes for growing them after positioning them in align mode
            saveCropBoxDimensions = { width: cropBoxes[LEFT].width, height: cropBoxes[LEFT].height };
        }

        if (DEBUG) {
            // Final validation to ensure boxes stay within bounds
            validateCropBoxes("updateCropBoxes");
        }
    }

    // Shrink the boxes as much as possible while maintaining the aspect ratio
    function shrinkBoxes(box1, box2) {
        const minCropSizeCanvas = minCropSizePixels * currentScale;

        const ratio = box1.width / box1.height;
        if (ratio > 1) {
            box1.width = box2.width = ratio * minCropSizeCanvas;
            box1.height = box2.height = minCropSizeCanvas;
        } else {
            box1.width = box2.width = minCropSizeCanvas;
            box1.height = box2.height = minCropSizeCanvas / ratio;
        }
    }

    function growCorner(leftBox, rightBox, xGrow, yGrow, ratio) {
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

    // Enlarge the boxes as much as possible while maintaining the aspect ratio
    function growBoxes(leftBox, rightBox) {
        const img1Width = window.images[0].width * currentScale;
        const img1Height = window.images[0].height * currentScale;
        const img2Width = window.images[1].width * currentScale;
        const img2Height = window.images[1].height * currentScale;
        const maxWidth = saveCropBoxDimensions.width;
        const maxHeight = saveCropBoxDimensions.height;
        const ratio = maxWidth / maxHeight;

        // bottom right
        {
            const leftBoxDistToRightEdge = img1Width - leftBox.x - leftBox.width;
            const rightBoxDistToRightEdge = img2Width - rightBox.x - rightBox.width;
            const leftBoxDistToBottom = img1Height - leftBox.y - leftBox.height;
            const rightBoxDistToBottom = img2Height - rightBox.y - rightBox.height;
    
            const maxGrowRight = Math.min(leftBoxDistToRightEdge, rightBoxDistToRightEdge, maxWidth - leftBox.width);
            const maxGrowDown = Math.min(leftBoxDistToBottom, rightBoxDistToBottom, maxHeight - leftBox.height);
    
            growCorner(leftBox, rightBox, maxGrowRight, maxGrowDown, ratio);
        }

        // bottom left
        {
            const leftBoxDistToBottom = img1Height - leftBox.y - leftBox.height;
            const rightBoxDistToBottom = img2Height - rightBox.y - rightBox.height;
    
            const maxX = Math.min(leftBox.x, rightBox.x, maxWidth - leftBox.width);
            const maxGrowDown = Math.min(leftBoxDistToBottom, rightBoxDistToBottom, maxHeight - leftBox.height);

            const { xDir } = growCorner(leftBox, rightBox, maxX, maxGrowDown, ratio);
            leftBox.x -= xDir;
            rightBox.x -= xDir;
        }

        // top right
        {
            const leftBoxDistToRightEdge = img1Width - leftBox.x - leftBox.width;
            const rightBoxDistToRightEdge = img2Width - rightBox.x - rightBox.width;

            const maxGrowRight = Math.min(leftBoxDistToRightEdge, rightBoxDistToRightEdge, maxWidth - leftBox.width);
            const maxY = Math.min(leftBox.y, rightBox.y, maxHeight - leftBox.height);

            const { yDir } = growCorner(leftBox, rightBox, maxGrowRight, maxY, ratio);
            leftBox.y -= yDir;
            leftBox.yOffset -= yDir;
            rightBox.y -= yDir;
            rightBox.yOffset -= yDir;
        }

        // top left
        {
            const maxX = Math.min(leftBox.x, rightBox.x, maxWidth - leftBox.width);
            const maxY = Math.min(leftBox.y, rightBox.y, maxHeight - leftBox.height);

            const { xDir, yDir } = growCorner(leftBox, rightBox, maxX, maxY, ratio);
            leftBox.x -= xDir;
            rightBox.x -= xDir;
            leftBox.y -= yDir;
            leftBox.yOffset -= yDir;
            rightBox.y -= yDir;
            rightBox.yOffset -= yDir;
        }
    }

    // Small tolerance value
    const epsilon = 0.001;
    // Helper function to check if a box is within bounds
    function isBoxInBounds(box, maxWidth, maxHeight) {
        const minCropSizeCanvas = minCropSizePixels * currentScale;
        
        // Check all constraints
        if (box.x < -epsilon) return false;
        if (box.y < -epsilon) return false;
        if (box.width < minCropSizeCanvas - epsilon) return false;
        if (box.height < minCropSizeCanvas - epsilon) return false;
        if (box.x + box.width > maxWidth + epsilon) return false;
        if (box.y + box.height > maxHeight + epsilon) return false;
        
        return true;
    }

    function moveBox(box, deltaX, deltaY, maxWidth, maxHeight) {
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

    function canBoxMove(box, boxType) {
        // Determine if a box has any room to move in any direction
        const maxWidth = boxType === LEFT ? 
                         window.images[0].width * currentScale : 
                         window.images[1].width * currentScale;
        const maxHeight = boxType === LEFT ? 
                          window.images[0].height * currentScale : 
                          window.images[1].height * currentScale;
        
        // Check if there's room to move in any direction
        const canMoveLeft = box.x > epsilon;
        const canMoveRight = box.x + box.width < maxWidth - epsilon;
        const canMoveUp = box.y > epsilon;
        const canMoveDown = box.y + box.height < maxHeight - epsilon;
        return {
            canMoveLeft, canMoveRight, canMoveUp, canMoveDown
        };
    }

    function resizeBox(box, handle, deltaX, deltaY, maxWidth, maxHeight) {
        const minCropSizeCanvas = minCropSizePixels * currentScale;
        const boxAspectRatio = box.width / box.height;
        
        // Handle corner resize cases (maintains aspect ratio)
        // Magic code to keep the cursor on the resize box when following the diagonal of the crop box
        if ([TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT].includes(handle)) {
            // Create a mapping of corner handles to their direction vectors
            const cornerDirections = {
                [TOP_LEFT]: { x: -boxAspectRatio, y: -1 },
                [TOP_RIGHT]: { x: boxAspectRatio, y: -1 },
                [BOTTOM_LEFT]: { x: -boxAspectRatio, y: 1 },
                [BOTTOM_RIGHT]: { x: boxAspectRatio, y: 1 }
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
            case TOP_LEFT: {
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
            
            case TOP_RIGHT: {
                // Adjust width
                box.width = Math.max(minCropSizeCanvas, Math.min(box.width + deltaX, maxWidth - box.x));
                
                // Maintain aspect ratio
                const newHeight = box.width / boxAspectRatio;
                const heightChange = box.height - newHeight;
                box.y += heightChange;
                box.height = newHeight;
                break;
            }
            
            case BOTTOM_LEFT: {
                // Adjust x position and width
                const newX = Math.max(0, Math.min(box.x + deltaX, box.x + box.width - minCropSizeCanvas));
                const widthChange = box.x - newX;
                box.x = newX;
                box.width += widthChange;
                
                // Maintain aspect ratio
                box.height = box.width / boxAspectRatio;
                break;
            }
            
            case BOTTOM_RIGHT: {
                // Adjust width
                box.width = Math.max(minCropSizeCanvas, Math.min(box.width + deltaX, maxWidth - box.x));
                
                // Maintain aspect ratio
                box.height = box.width / boxAspectRatio;
                break;
            }
            
            case TOP_MIDDLE: {
                // Adjust y position and height - no aspect ratio
                const newY = Math.max(0, Math.min(box.y + deltaY, box.y + box.height - minCropSizeCanvas));
                const heightChange = box.y - newY;
                box.y = newY;
                box.height += heightChange;
                break;
            }
            
            case RIGHT_MIDDLE: {
                // Adjust width - no aspect ratio
                box.width = Math.max(minCropSizeCanvas, Math.min(box.width + deltaX, maxWidth - box.x));
                break;
            }
            
            case BOTTOM_MIDDLE: {
                // Adjust height - no aspect ratio
                box.height = Math.max(minCropSizeCanvas, Math.min(box.height + deltaY, maxHeight - box.y));
                break;
            }
            
            case LEFT_MIDDLE: {
                // Adjust x position and width - no aspect ratio
                const newX = Math.max(0, Math.min(box.x + deltaX, box.x + box.width - minCropSizeCanvas));
                const widthChange = box.x - newX;
                box.x = newX;
                box.width += widthChange;
                break;
            }
        }
    }

    function applyCrop() {
        // tidy up after align mode
        alignModeRestorePreviousScalePercent();
        // Exit crop mode
        exitCrop();
        window.isCropped = true;
        resetCropButton.style.display = 'block';

        // Save the current crop state before applying
        lastCropState = {
            boxes: [ { ...cropBoxes[LEFT] }, { ...cropBoxes[RIGHT] } ],
            saveCropBoxDimensions: { ...saveCropBoxDimensions },
            scale: currentScale,
            scalePercent: currentScale / window.maxScale,
            swapped: false
        };

        // Calculate the crop in original image coordinates
        const cropLeft = {
            x: Math.round(cropBoxes[LEFT].x / currentScale),
            y: Math.round(cropBoxes[LEFT].y / currentScale),
            width: Math.round(cropBoxes[LEFT].width / currentScale),
            height: Math.round(cropBoxes[LEFT].height / currentScale)
        };
        
        const cropRight = {
            x: Math.round(cropBoxes[RIGHT].x / currentScale),
            y: Math.round(cropBoxes[RIGHT].y / currentScale),
            width: Math.round(cropBoxes[RIGHT].width / currentScale),
            height: Math.round(cropBoxes[RIGHT].height / currentScale)
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
        tempCtx1.drawImage(window.images[0], 
            cropLeft.x, cropLeft.y, cropLeft.width, cropLeft.height,
            0, 0, cropLeft.width, cropLeft.height);
            
        tempCtx2.drawImage(window.images[1], 
            cropRight.x, cropRight.y, cropRight.width, cropRight.height,
            0, 0, cropRight.width, cropRight.height);
        
        // Create new image objects from the canvases
        const newImg1 = new Image();
        const newImg2 = new Image();
        
        newImg1.onload = function() {
            window.images[0] = newImg1;
            
            newImg2.onload = function() {
                window.images[1] = newImg2;
                const scalePercent = getLocalStorageItem('croppedScalePercent', preCropScalePercent);
                updateScalePercent(scalePercent);
                // Redraw with cropped images
                window.drawImages();
            };
            newImg2.src = tempCanvas2.toDataURL();
        };
        newImg1.src = tempCanvas1.toDataURL();
    }

    function cancelCrop() {
        // Restore previously cropped images if this was a subsequent crop operation
        if (tempCroppedImages) {
            window.images[0] = tempCroppedImages[0];
            window.images[1] = tempCroppedImages[1];
            tempCroppedImages = null;
        }

        exitCrop();
        // resetScalePercent is kept up to date with latest uncroppedScalePercent
        const scalePercent = window.isCropped ? preCropScalePercent : resetScalePercent;
        updateScalePercent(scalePercent);

        // Redraw the images without crop overlay
        window.drawImages();
    }

    // reset buttons etc to non-cropping state
    function exitCrop() {
        isCropping = false;
        isDragging = false;
        isArrowing = false;
        applyCropButton.style.display = 'none';
        cancelCropButton.style.display = 'none';
        cropOptionsControlGroup.style.display = 'none'; // Hide crop options in left panel
        cropButton.style.display = 'block';
        canvas.style.cursor = 'default';
        window.saveButton.disabled = false;
    }

    function updateScalePercent(scalePercent) {
        // Calculate maximum scale for current images
        // console.log("scalePercent =", scalePercent);
        const optimalScale = window.calculateMaxScale(window.images[0], window.images[1]);
        window.setScalePercent(scalePercent, optimalScale);
    }

    function onSwap() {
        if (originalImages) {
            [originalImages[0], originalImages[1]] = [originalImages[1], originalImages[0]];
        }
        if (tempCroppedImages) {
            [tempCroppedImages[0], tempCroppedImages[1]] = [tempCroppedImages[1], tempCroppedImages[0]];
        }

        // Maintain swapped state of lastCropState
        if (lastCropState) {
            lastCropState.swapped = !lastCropState.swapped;
        }

        if (isCropping) {
            if (alignMode) {
                [ alignImage0, alignImage1 ] = [ alignImage1, alignImage0 ];
            }
            // Swap crop boxes with appropriate width calculations
            swapBoxes(cropBoxes);
            drawCropInterface();
        } else {
            window.drawImages();
        }
    }

    // swap the crop boxes
    function swapBoxes(boxes) {
        [ boxes[LEFT], boxes[RIGHT] ] = [ boxes[RIGHT], boxes[LEFT] ];
    }

    function onScaleChange(scalePercent) {
        // only gets called when isCropping
        // set current scale
        if (scalePercent !== 0) {
            // new scale percent
            if (alignMode) {
                alignModeScalePercent = scalePercent;
                window.setLocalStorageItem('alignModeScalePercent', scalePercent);
            } else {
                // keeping resetScalePercent up to date in case local storage is not working
                resetScalePercent = scalePercent;
                window.setLocalStorageItem('uncroppedScalePercent', scalePercent);
            }
            window.setScalePercent(scalePercent);
        } else {
            // just adjust to new max scale
            const optimalScale = window.calculateMaxScale(window.images[0], window.images[1], alignMode);
            window.setScalePercent(currentScale / window.maxScale, optimalScale);
        }

        // adjust crop boxes to new scale
        adjustToNewScale();

        // Redraw with updated boxes
        drawCropInterface();
    }

    // adjust crop boxes to new scale
    function adjustToNewScale(scaleRatio = window.scale / currentScale) {
        adjustScale(cropBoxes[LEFT], scaleRatio);
        adjustScale(cropBoxes[RIGHT], scaleRatio);
        saveCropBoxDimensions.width *= scaleRatio;
        saveCropBoxDimensions.height *= scaleRatio;
        currentScale = window.scale;
    }

    function adjustScale(box, scaleRatio) {
        box.x *= scaleRatio;
        box.y *= scaleRatio;
        box.width *= scaleRatio;
        box.height *= scaleRatio;
        box.yOffset *= scaleRatio;
    }

    function resetCrop() {
        if (originalImages) {
            exitCrop();
            resetCropButton.style.display = 'none';
            window.isCropped = false;

            // Restore original images if images are currently being displayed
            if (window.images.length === 2) {
                window.images[0] = originalImages[0].cloneNode(true);
                window.images[1] = originalImages[1].cloneNode(true);
                // reset scale to uncropped
                updateScalePercent(resetScalePercent);
                // Redraw with original images
                window.drawImages();
            } else {
                // reset scale to uncropped
                window.setScalePercent(resetScalePercent);
            }

            // Reset original images array and last crop state
            originalImages = null;
            lastCropState = null;
            tempCroppedImages = null;
            activeCropBox = null;
            movableBoxes = [ false, false ];
        }
    }

    const canvasContainer = document.getElementById('canvasContainer');

    // Add a fullscreen toggle
    function addFullscreenOption() {
        // Create fullscreen button
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
        
        // Find the appropriate container to append the button
        canvasContainer.style.position = 'relative';
        canvasContainer.appendChild(fullscreenButton);
        
        // Show button when canvas is displayed
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'style' && 
                    canvasContainer.style.display !== 'none') {
                    fullscreenButton.style.display = 'flex';
                }
            });
        });
        
        observer.observe(canvasContainer, { attributes: true });
        
        // Toggle fullscreen mode
        fullscreenButton.addEventListener('click', function() {
            toggleFullscreen(canvasContainer);
        });

        // Listen for fullscreen change events to update button
        document.addEventListener('fullscreenchange', fullScreenChange);
        document.addEventListener('webkitfullscreenchange', fullScreenChange);
        document.addEventListener('mozfullscreenchange', fullScreenChange);
        document.addEventListener('MSFullscreenChange', fullScreenChange);

        function fullScreenChange() {
            // console.log("uFSB:", document.fullscreenElement === null ? "ffs" : "tfs");
            if (document.fullscreenElement || 
                document.webkitFullscreenElement || 
                document.mozFullScreenElement || 
                document.msFullscreenElement) {
                // To fullscreen mode
                fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7"></path></svg>';
            } else {
                // Not in fullscreen mode
                fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
            }
            setTimeout(() => {
                window.onResize(null, "uFSB");
            }, 250);
        }
        
        // Add fullscreen styles
        const style = document.createElement('style');
        style.textContent = `
            #canvasContainer:fullscreen {
                background-color: #121212;
                padding: 20px;
                display: flex !important;
                align-items: center;
                justify-content: center;
                overflow: auto;
            }
            #canvasContainer:fullscreen #canvas {
                // max-height: 95vh !important;
                object-fit: contain;
            }
            
            /* Vendor prefixed versions */
            #canvasContainer:-webkit-full-screen {
                background-color: #121212;
                padding: 20px;
                display: flex !important;
                align-items: center;
                justify-content: center;
            }
            #canvasContainer:-moz-full-screen {
                background-color: #121212;
                padding: 20px;
                display: flex !important;
                align-items: center;
                justify-content: center;
            }
            #canvasContainer:-ms-fullscreen {
                background-color: #121212;
                padding: 20px;
                display: flex !important;
                align-items: center;
                justify-content: center;
            }
        `;
        document.head.appendChild(style);
    }

    // Fullscreen toggle function
    function toggleFullscreen(element) {
        if (!document.fullscreenElement && 
            !document.mozFullScreenElement && 
            !document.webkitFullscreenElement && 
            !document.msFullscreenElement) {
            // Enter fullscreen
            // console.log("tfs");
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
            // console.log("ffs");
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

    // Initialize fullscreen option
    addFullscreenOption();


    // Arrow key navigation state
    let arrowKeyMultiplier = 1;     // Default step size multiplier
    // timeout for deltaYOffset change
    let deltaYOffsetChangeTimeoutID = null;

    // Arrow key navigation handlers
    window.addEventListener('keydown', onKeyDown);

    function nextTab() {
        if (currentHandle === OUTSIDE) {
            currentHandle = INSIDE;
            activeCropBox = LEFT;
        } else if (activeCropBox === LEFT && !alignMode) {
            activeCropBox = RIGHT;
        } else {
            currentHandle = OUTSIDE;
            activeCropBox = LEFT;
        }
        return getMovableBoxes(currentHandle);
    }

    function onKeyDown(e) {
        // Check if an input element is focused
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA') {
            return;
        }

        if (e.key === 'x') {
            window.updateSwap();
            e.preventDefault();
            return;
        } else if (e.key === 'f') {
            toggleFullscreen(canvasContainer);
            e.preventDefault();
            return;
        }

        if (!isCropping) return;

        if (activeCropBox === null) {
            activeCropBox = LEFT;
        }
        let deltaX = 0;
        let deltaY = 0;
        
        // Set multiplier for Shift key (faster movement)
        arrowKeyMultiplier = e.shiftKey ? 5 : 1;
        
        // Handle arrow keys
        switch (e.key) {
            case 'a':
                toggleAlignMode();
                e.preventDefault();
                return;
            case 'h':
                toggleClampCheckbox(true);
                e.preventDefault();
                return;
            case 'ArrowLeft':
                deltaX = -1 * arrowKeyMultiplier;
                e.preventDefault();
                break;
            case 'ArrowRight':
                deltaX = 1 * arrowKeyMultiplier;
                e.preventDefault();
                break;
            case 'ArrowUp':
                deltaY = -1 * arrowKeyMultiplier;
                e.preventDefault();
                break;
            case 'ArrowDown':
                deltaY = 1 * arrowKeyMultiplier;
                e.preventDefault();
                break;
            case 'Tab':
                // Toggle between left, right, and both boxes
                e.preventDefault();

                // check if highlight should be shown
                const wasMovable = movableBoxes;
                movableBoxes = nextTab();
                if (!movableBoxes[LEFT] && !movableBoxes[RIGHT]) {
                    movableBoxes = nextTab();
                    if (!alignMode && !movableBoxes[LEFT] && !movableBoxes[RIGHT]) {
                        movableBoxes = nextTab();
                    }
                }
                drawCropInterface(movableBoxHighlights(wasMovable));
                return;
            default:
                return; // Ignore other keys
        }

        // set up for moving boxes
        if (!isArrowing) {
            isArrowing = true;
            startMove();
        }

        // Set up for movement
        updateCropBoxes(currentHandle, activeCropBox, deltaX, deltaY);

        // stop any scheduled process
        if (deltaYOffsetChangeTimeoutID) {
            clearTimeout(deltaYOffsetChangeTimeoutID);
        }
        // ensure that both images are not above or below the top of the canvas
        // delay until the user releases the key
        deltaYOffsetChangeTimeoutID = setTimeout(onArrowEnd, alignMode && currentHandle === INSIDE ? 1200 : 500);

        // Redraw the interface
        drawCropInterface();
    }

    function onArrowEnd() {
        if (isCropping && isArrowing) {
            isArrowing = false;

            // ensure that both images are not above or below the top of the canvas
            animateFixImagePositions();

            if (alignMode && currentHandle === INSIDE) {
                // grow the boxes as much as possible after shrinking and repositioning them
                growBoxes(cropBoxes[LEFT], cropBoxes[RIGHT]);
            }

            drawCropInterface();
        }
    }

    function addCheckboxControls() {
        // Create the align mode checkbox
        const alignCheckbox = document.createElement('input');
        alignCheckbox.type = 'checkbox';
        alignCheckbox.id = 'alignCheckbox';
        
        // Create the align label
        const alignLabel = document.createElement('label');
        alignLabel.htmlFor = 'alignCheckbox';
        alignLabel.textContent = 'Align Mode (a)';
        
        // Create wrapper div for first checkbox and label
        const alignWrapper = document.createElement('div');
        alignWrapper.className = 'control-row';
        alignWrapper.style.marginBottom = '10px';
        alignWrapper.appendChild(alignCheckbox);
        alignWrapper.appendChild(alignLabel);
        
        // Create the clamp checkbox (horizontal only)
        const clampCheckbox = document.createElement('input');
        clampCheckbox.type = 'checkbox';
        clampCheckbox.id = 'horizontalClampCheckbox';
        
        // Create the clamp label
        const clampLabel = document.createElement('label');
        clampLabel.htmlFor = 'horizontalClampCheckbox';
        clampLabel.textContent = 'Horizontal Only (h)';
        
        // Create wrapper div for checkbox and label
        const clampWrapper = document.createElement('div');
        clampWrapper.className = 'control-row';
        clampWrapper.style.marginBottom = '10px';
        clampWrapper.appendChild(clampCheckbox);
        clampWrapper.appendChild(clampLabel);
        
        // Create the draw boxes checkbox
        const drawBoxesCheckbox = document.createElement('input');
        drawBoxesCheckbox.type = 'checkbox';
        drawBoxesCheckbox.id = 'drawBoxesCheckbox';
        
        // Create the draw boxes label
        const drawBoxesLabel = document.createElement('label');
        drawBoxesLabel.htmlFor = 'drawBoxesCheckbox';
        drawBoxesLabel.textContent = 'Draw Boxes';
        
        // Create wrapper div for checkbox and label
        const drawBoxesWrapper = document.createElement('div');
        drawBoxesWrapper.className = 'control-row';
        drawBoxesWrapper.appendChild(drawBoxesCheckbox);
        drawBoxesWrapper.appendChild(drawBoxesLabel);
        
        // Add to control group in left panel
        cropOptionsControlGroup.appendChild(alignWrapper);
        cropOptionsControlGroup.appendChild(clampWrapper);
        cropOptionsControlGroup.appendChild(drawBoxesWrapper);

        // Add event listener for align checkbox change
        alignCheckbox.addEventListener('change', toggleAlignMode);

        // Add event listener for clamp checkbox change
        clampCheckbox.addEventListener('change', () => toggleClampCheckbox(false));
    
        // Add event listener for draw boxes checkbox change
        drawBoxesCheckbox.addEventListener('change', function() {
            window.setLocalStorageItem('drawCropBoxes', this.checked);
            drawCropInterface();
        });

        // Initialize from local storage with default values
        alignCheckbox.checked = window.getLocalStorageItem('alignCheckBox', true);
        alignMode = alignCheckbox.checked;
        clampCheckbox.checked = window.getLocalStorageItem('clampCheckBox', false);
        drawBoxesCheckbox.checked = window.getLocalStorageItem('drawCropBoxes', true);
        
        // Make checkboxes available globally
        window.clampCheckbox = clampCheckbox;
        window.drawBoxesCheckbox = drawBoxesCheckbox;
    }    

    function toggleClampCheckbox(key = false) {
        if (key) {
            // called from key press
            clampCheckbox.checked = !clampCheckbox.checked;
        }

        window.setLocalStorageItem('clampCheckBox', clampCheckbox.checked);
        clampMode = clampCheckbox.checked ? HORIZONTAL_CLAMP : NO_CLAMP;

        updateCursor(currentHandle);
        const wasMovable = movableBoxes;
        movableBoxes = getMovableBoxes(currentHandle);
        drawCropInterface(movableBoxHighlights(wasMovable));
    }

    // initialize check boxes, add to first control group
    const cropOptionsControlGroup = document.createElement('div');
    cropOptionsControlGroup.id = 'cropOptionsControlGroup';
    cropOptionsControlGroup.className = 'control-group';
    cropOptionsControlGroup.style.display = 'none'; // Initially hidden
    controlGroup.appendChild(cropOptionsControlGroup);
    addCheckboxControls();


    // code implementing align mode
    let alignModeSavePreviousScalePercent = 0;
    let alignModeScalePercent = 0;
    let alignModeCropRatio = 0;

    // remember the size of the boxes for growing them after positioning them in align mode
    let saveCropBoxDimensions = { width: 0, height: 0 };

    // transformed images for aligning
    let alignImage0, alignImage1 = null;

    function enterAlignMode() {
        alignMode = true;
        window.setLocalStorageItem('alignCheckBox', true);
        alignCheckbox.checked = true;
        alignModeCropRatio = cropBoxes[LEFT].width / cropBoxes[LEFT].height;

        alignModeSavePreviousScalePercent = currentScale / window.maxScale;
        if (alignModeScalePercent === 0) {
            alignModeScalePercent = window.getLocalStorageItem('alignModeScalePercent', alignModeSavePreviousScalePercent);
        }
        // we are displaying overlaid images so get the new max scale
        const optimalScale = window.calculateMaxScale(window.images[0], window.images[1], true);
        window.setScalePercent(alignModeScalePercent, optimalScale);

        // adjust crop boxes to new scale
        adjustToNewScale();

        [ currentHandle, activeCropBox ] = [ OUTSIDE, LEFT ];
        updateCursor(currentHandle);
        movableBoxes = getMovableBoxes(currentHandle);
        drawCropInterface(movableBoxes);

        // transform images for easier aligning
        alignImage0 = transformImage(images[0], (r, g, b, a, x, y) => {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const inverse = 255 - gray;
            return [ inverse, inverse, inverse, a ];
        });
        alignImage1 = transformImage(images[1], (r, g, b, a, x, y) => {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            return [ gray, gray, gray, a ];
        });
    }

    function exitAlignMode() {
        alignModeRestorePreviousScalePercent();
        alignMode = false;
        window.setLocalStorageItem('alignCheckBox', false);
        alignCheckbox.checked = false;

        [ currentHandle, activeCropBox ] = [ OUTSIDE, LEFT ];
        updateCursor(currentHandle);
        movableBoxes = getMovableBoxes(currentHandle);
        drawCropInterface(movableBoxes);
    }

    function toggleAlignMode() {
        if (alignMode) {
            exitAlignMode();
        } else {
            enterAlignMode();
        }
    }

    function alignModeRestorePreviousScalePercent() {
        if (alignMode) {
            updateScalePercent(alignModeSavePreviousScalePercent);
            // adjust crop boxes to new scale
            adjustToNewScale();
        }
    }

    // check image positions relative to top of canvas
    function checkImagePositions() {
        if (cropBoxes[LEFT].yOffset < 0 && cropBoxes[RIGHT].yOffset < 0) {
            // Both boxes are above the canvas - calculate adjustment to bring one down
            return Math.max(cropBoxes[LEFT].yOffset, cropBoxes[RIGHT].yOffset);
        } else if (cropBoxes[LEFT].yOffset > 0 && cropBoxes[RIGHT].yOffset > 0) {
            // Both boxes are below the canvas top - calculate adjustment to bring one up
            return Math.min(cropBoxes[LEFT].yOffset, cropBoxes[RIGHT].yOffset);
        }
        return 0;
    }

    // ensure that both images are not above or below the top of the canvas
    function animateFixImagePositions() {
        const deltaYOffset = checkImagePositions();
        // If we need to adjust offsets, animate the change
        if (deltaYOffset !== 0) {
            animateOffsetChange(deltaYOffset);
        }
    }

    function drawCropInterfaceAlignMode() {    
        const aligning = currentHandle === INSIDE && (isDragging || isArrowing);    

        // Draw images with both x and y offsets
        drawImagesAlignMode(aligning);

        // ensure that both images are not above or below the top of the canvas
        const deltaYOffset = checkImagePositions();
        if (deltaYOffset !== 0) {
            cropBoxes[LEFT].yOffset -= deltaYOffset;
            cropBoxes[RIGHT].yOffset -= deltaYOffset;
        }

        // draw handles etc if not positioning the images relative to each other
        if (!aligning) {
            drawCropBoxesAlignMode();
        }
    }

    function drawCropBoxesAlignMode() {
        // Get the main canvas context
        const ctx = canvas.getContext('2d');

        // draw with right box
        const box = cropBoxes[RIGHT];

        // Draw semi-transparent overlay for areas outside the crop box
        ctx.globalAlpha = CROP_BOX_OVERLAY_OPACITY;
        ctx.fillStyle = bodyBackgroundColor;

        ctx.fillRect(0, 0, box.x, canvas.height);
        ctx.fillRect(box.x, 0, canvas.width - box.x, box.y);
        ctx.fillRect(box.x + box.width, box.y, canvas.width - (box.x + box.width), canvas.height - box.y);
        ctx.fillRect(box.x, box.y + box.height, box.width, canvas.height - (box.y + box.height));

        ctx.globalAlpha = 1.0;

        // draw the box (optionally) and handles
        const glowParams = glowParameters();
        configureBoxStyle(ctx, movableBoxes[LEFT] || movableBoxes[RIGHT], glowParams);

        if (drawBoxesCheckbox.checked) {
            ctx.strokeRect(box.x, box.y, box.width, box.height);
        }

        drawHandles(ctx, box, BOTH);

        // Reset to defaults
        // ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        handleSize = HANDLE_SIZE;
        ctx.globalAlpha = 1.0;

        if (DEBUG) {
            // draw the touch points
            getHandle(0, 0);
        }
    }

    function drawImagesAlignMode(aligning) {
        if (images.length !== 2) return null;

        // Get the main canvas context
        const ctx = canvas.getContext('2d');

        // Calculate dimensions
        const img1Width = images[0].width * currentScale;
        const img2Width = images[1].width * currentScale;
        const totalWidth = Math.max(img1Width, img2Width);
        
        const img1Height = images[0].height * currentScale;
        const img2Height = images[1].height * currentScale;
        const maxHeight = Math.max(img1Height, img2Height);

        // // Save image dimensions and positions
        // currentParams = { img1Width, img1Height, img2Width, img2Height, rightImgStart: 0 };

        // Set canvas dimensions
        canvas.width = totalWidth;
        canvas.height = maxHeight;

        // Clear the canvas
        ctx.clearRect(0, 0, totalWidth, maxHeight);

        // Draw the right image
        ctx.drawImage(
            aligning ? alignImage1 : images[1],
            0, 0,                                   // Source position
            images[1].width, images[1].height,      // Source dimensions
            0, 0,                                   // Destination position
            img2Width, img2Height                   // Destination dimensions
        );

        const xOffset = (cropBoxes[RIGHT].x - cropBoxes[LEFT].x);
        const yOffset = (cropBoxes[RIGHT].y - cropBoxes[LEFT].y);

        ctx.globalAlpha = 0.50;
        // Draw the left image
        ctx.drawImage(
            aligning ? alignImage0 : images[0],
            0, 0,                                   // Source position
            images[0].width, images[0].height,      // Source dimensions
            xOffset, yOffset,                       // Destination position with offsets
            img1Width, img1Height                   // Destination dimensions
        );
        ctx.globalAlpha = 1;
    }

// Expose functions to global scope and the isCropping flag
    window.cropModule = {
        resetCrop,
        onScaleChange,
        onSwap,
        drawCropInterface,
        isCropping: function() { return isCropping; },
        cropButton
    }
});