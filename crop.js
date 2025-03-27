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
    let cropBoxes = {
        left: { x: 0, y: 0, width: 0, height: 0 },
        right: { x: 0, y: 0, width: 0, height: 0 }
    };
    let handleSize = 14;

    // Original scale before any cropping
    let originalScale = 0;
    // Scale prior to entering crop mode
    let preCropScale = 0;
    
    // Track crop state
    let isDragging = false;
    let currentHandle = null;
    let activeCropBox = null;
    let dragStartX = 0;
    let dragStartY = 0;
    
    // Current parameters from main script
    let currentScale = 0.5; // Default 50%
    let currentParams = null;
    
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

    // Additional considerations for touch devices
    if (isTouch()) {
        handleSize = 20;
    }

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

    // start mouse or touch drag
    function startDrag(e) {
        isDragging = true;

        const [x, y] = getXY(e);
        dragStartX = x;
        dragStartY = y;

        // Check if a handle is selected
        const handleInfo = getHandle(x, y);        
        currentHandle = handleInfo.handle;
        activeCropBox = handleInfo.box;

        updatemovableBoxes(currentHandle);
        drawCropInterface();
    }

    function onTouchStart(e) {
        if (!isCropping) return;
        // Prevent default to avoid scrolling/zooming while cropping
        e.preventDefault();
        startDrag(e.touches[0]);
    }

    function onTouchMove(e) {
        if (!isCropping) return;
        // Prevent default to avoid scrolling/zooming while cropping
        e.preventDefault();
        if (!isDragging) return;

        const [x, y] = getXY(e.touches[0]);
        const deltaX = x - dragStartX;
        const deltaY = y - dragStartY;
        dragStartX = x;
        dragStartY = y;
        
        updateCropBoxes(currentHandle, activeCropBox, deltaX, deltaY);
        drawCropInterface();
    }

    function onTouchEnd(e) {
        if (!isCropping) return;
        // Prevent default to avoid scrolling/zooming while cropping
        e.preventDefault();
        isDragging = false;
    }

    function startCrop() {
        if (!window.images || window.images.length !== 2) {
            alert('Please add two images before cropping.');
            return;
        }
        
        // Store current scale before changing it
        preCropScale = window.scale;
        // Save original scale in case we reset the crop while not in crop mode
        if (originalScale === 0) {
            originalScale = preCropScale;
        }
        
        // If we have a previous crop state, revert to that scale temporarily
        if (lastCropState) {
            // Update global scale
            window.setScale(lastCropState.scale);
        }
        
        // Store original images if not already stored
        if (!originalImages) {
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

        // Show crop controls
        cropButton.style.display = 'none';
        applyCropButton.style.display = 'block';
        cancelCropButton.style.display = 'block';
        
        // Get current scale and parameters
        currentScale = window.scale;
        // Redraw images to get parameters for original images
        currentParams = window.drawImages();
        
        // Always initialize crop boxes
        initCropBoxes();
        
        // If we have a previous crop state, restore those dimensions
        if (lastCropState) {
            // Adjust for any scale changes
            const scaleRatio = currentScale / lastCropState.scale;
            
            // Update left crop box
            cropBoxes.left = {
                x: lastCropState.leftBox.x * scaleRatio,
                y: lastCropState.leftBox.y * scaleRatio,
                width: lastCropState.leftBox.width * scaleRatio,
                height: lastCropState.leftBox.height * scaleRatio
            };
            
            // Get right image start position based on current parameters
            const rightImgStart = currentParams.img1Width + currentParams.renderGap;
            
            // Calculate the adjusted right box position
            cropBoxes.right = {
                x: rightImgStart + ((lastCropState.rightBox.x - lastCropState.rightImgStart) * scaleRatio),
                y: lastCropState.rightBox.y * scaleRatio, // Use right box's own Y position
                width: lastCropState.rightBox.width * scaleRatio,
                height: lastCropState.rightBox.height * scaleRatio
            };
            
            // Make sure boxes stay in bounds
            validateCropBoxes();
        }

        // Draw crop interface
        updatemovableBoxes('outside');
        drawCropInterface();
    }

    // make sure box dimensions are valid and the same
    function validateCropBoxes() {
        // Get current image dimensions
        const img1Width = window.images[0].width * currentScale;
        const img1Height = window.images[0].height * currentScale;
        const img2Width = window.images[1].width * currentScale;
        const img2Height = window.images[1].height * currentScale;
        
        // Get right image start position
        const rightImgStart = img1Width + (currentParams ? currentParams.renderGap : 0);
        
        // Ensure left box stays within left image bounds
        cropBoxes.left.x = Math.max(0, Math.min(cropBoxes.left.x, img1Width - handleSize * 2));
        cropBoxes.left.y = Math.max(0, Math.min(cropBoxes.left.y, img1Height - handleSize * 2));
        cropBoxes.left.width = Math.max(handleSize * 2, Math.min(cropBoxes.left.width, img1Width - cropBoxes.left.x));
        cropBoxes.left.height = Math.max(handleSize * 2, Math.min(cropBoxes.left.height, img1Height - cropBoxes.left.y));
        
        // Ensure right box stays within right image bounds
        cropBoxes.right.x = Math.max(rightImgStart, Math.min(cropBoxes.right.x, rightImgStart + img2Width - handleSize * 2));
        cropBoxes.right.y = Math.max(0, Math.min(cropBoxes.right.y, img2Height - handleSize * 2));
        cropBoxes.right.width = Math.max(handleSize * 2, Math.min(cropBoxes.right.width, rightImgStart + img2Width - cropBoxes.right.x));
        cropBoxes.right.height = Math.max(handleSize * 2, Math.min(cropBoxes.right.height, img2Height - cropBoxes.right.y));
        
        // Enforce both crop boxes having the same height and width
        const minHeight = Math.min(cropBoxes.left.height, cropBoxes.right.height);
        const minWidth = Math.min(cropBoxes.left.width, cropBoxes.right.width);
        
        cropBoxes.left.height = minHeight;
        cropBoxes.right.height = minHeight;
        cropBoxes.left.width = minWidth;
        cropBoxes.right.width = minWidth;
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
        cropBoxes.left = {
            x: 0,
            y: 0,
            width: maxWidth,
            height: maxHeight
        };
        
        // Calculate the right image starting position
        const rightImgStart = img1Width + (currentParams ? currentParams.renderGap : 0);
        
        // Right crop box mirror's the left's position
        cropBoxes.right = {
            x: rightImgStart,
            y: 0,
            width: maxWidth,
            height: maxHeight
        };
    }
    
    function drawCropInterface() {
        // console.trace("Call stack:");
        // Get the main canvas context
        const ctx = canvas.getContext('2d');
        
        // First draw the images (using the main draw function)
        currentParams = window.drawImages();

        // Calculate image dimensions and positions
        const img1Width = window.images[0].width * currentScale;
        const img1Height = window.images[0].height * currentScale;
        const rightImgStart = img1Width + (currentParams ? currentParams.renderGap : 0);
        const img2Width = window.images[1].width * currentScale;
        const img2Height = window.images[1].height * currentScale;
        
        // Draw semi-transparent overlay for areas outside the crop boxes
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

        const leftBox = cropBoxes.left;
        const rightBox = cropBoxes.right;
        
        // Left image overlay
        // Top rectangle
        ctx.fillRect(0, 0, img1Width, leftBox.y);
        // Left rectangle
        ctx.fillRect(0, leftBox.y, leftBox.x, leftBox.height);
        // Right rectangle
        ctx.fillRect(leftBox.x + leftBox.width, leftBox.y, img1Width - (leftBox.x + leftBox.width), leftBox.height);
        // Bottom rectangle
        ctx.fillRect(0, leftBox.y + leftBox.height, img1Width, img1Height - (leftBox.y + leftBox.height));
        
        // Right image overlay
        // Top rectangle
        ctx.fillRect(rightImgStart, 0, img2Width, rightBox.y);
        // Left rectangle
        ctx.fillRect(rightImgStart, rightBox.y, rightBox.x - rightImgStart, rightBox.height);
        // Right rectangle
        ctx.fillRect(rightBox.x + rightBox.width, rightBox.y, (rightImgStart + img2Width) - (rightBox.x + rightBox.width), rightBox.height);
        // Bottom rectangle
        ctx.fillRect(rightImgStart, rightBox.y + rightBox.height, img2Width, img2Height - (rightBox.y + rightBox.height));
        
        // Draw crop borders
        ctx.lineWidth = 2;
        
        // Left crop box border (green if movable, orange otherwise)
        ctx.strokeStyle = movableBoxes.left ? '#33cc33' : '#ff9900';
        ctx.strokeRect(leftBox.x, leftBox.y, leftBox.width, leftBox.height);
        drawHandles(ctx, leftBox);
        
        // Right crop box border (green if movable, orange otherwise)
        ctx.strokeStyle = movableBoxes.right ? '#33cc33' : '#ff9900';
        ctx.strokeRect(rightBox.x, rightBox.y, rightBox.width, rightBox.height);
        drawHandles(ctx, rightBox);
    }
    
    function drawHandles(ctx, box) {
        // Define handle positions
        const handlePositions = [
            { id: 'topLeft', x: box.x, y: box.y },
            { id: 'topRight', x: box.x + box.width, y: box.y },
            { id: 'bottomLeft', x: box.x, y: box.y + box.height },
            { id: 'bottomRight', x: box.x + box.width, y: box.y + box.height },
            // Side handles
            { id: 'topMiddle', x: box.x + box.width / 2, y: box.y },
            { id: 'rightMiddle', x: box.x + box.width, y: box.y + box.height / 2 },
            { id: 'bottomMiddle', x: box.x + box.width / 2, y: box.y + box.height },
            { id: 'leftMiddle', x: box.x, y: box.y + box.height / 2 }
        ];
        
        // Draw handles
        ctx.fillStyle = ctx.strokeStyle;
        
        handlePositions.forEach(pos => {
            ctx.fillRect(
                pos.x - handleSize / 2,
                pos.y - handleSize / 2,
                handleSize,
                handleSize
            );
        });
    }
    
    function getHandle(x, y) {
        // Check if the mouse is over any handle of the left crop box
        const leftBox = cropBoxes.left;
        const leftHandle = getHandleForBox(leftBox, x, y);
        if (leftHandle) {
            return { handle: leftHandle, box: 'left' };
        }
        
        // Check if the mouse is over any handle of the right crop box
        const rightBox = cropBoxes.right;
        const rightHandle = getHandleForBox(rightBox, x, y);
        if (rightHandle) {
            return { handle: rightHandle, box: 'right' };
        }
        
        return { handle: 'outside', box: 'left' };
    }
    
    function getHandleForBox(box, x, y) {
        // Handle positions
        const handlePositions = [
            { id: 'topLeft', x: box.x, y: box.y },
            { id: 'topRight', x: box.x + box.width, y: box.y },
            { id: 'bottomLeft', x: box.x, y: box.y + box.height },
            { id: 'bottomRight', x: box.x + box.width, y: box.y + box.height },
            // Side handles
            { id: 'topMiddle', x: box.x + box.width / 2, y: box.y },
            { id: 'rightMiddle', x: box.x + box.width, y: box.y + box.height / 2 },
            { id: 'bottomMiddle', x: box.x + box.width / 2, y: box.y + box.height },
            { id: 'leftMiddle', x: box.x, y: box.y + box.height / 2 }
        ];
        
        for (const handle of handlePositions) {
            const hx = handle.x - handleSize / 2;
            const hy = handle.y - handleSize / 2;
            
            if (x >= hx && x <= hx + handleSize &&
                y >= hy && y <= hy + handleSize) {
                return handle.id;
            }
        }
        
        // Check if inside the crop box for dragging
        if (x >= box.x && x <= box.x + box.width &&
            y >= box.y && y <= box.y + box.height) {
            return 'inside';
        }
        
        return null;
    }
    
    function updateCursor(handle) {
        switch (handle) {
            case 'topLeft':
            case 'bottomRight':
                canvas.style.cursor = 'nwse-resize';
                break;
            case 'topRight':
            case 'bottomLeft':
                canvas.style.cursor = 'nesw-resize';
                break;
            case 'topMiddle':
            case 'bottomMiddle':
                canvas.style.cursor = 'ns-resize';
                break;
            case 'leftMiddle':
            case 'rightMiddle':
                canvas.style.cursor = 'ew-resize';
                break;
            case 'inside':
                canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
                break;
            case 'outside':
                canvas.style.cursor = isDragging ? 'grabbing' : 'move';
                break;
            default:
                canvas.style.cursor = 'default';
        }
    }

    function onMouseDown(e) {
        if (!isCropping) return;
        startDrag(e);

        updateCursor(currentHandle);
        document.documentElement.style.cursor = canvas.style.cursor;
    }

    function onMouseMove(e) {
        if (!isCropping) return;

        const [x, y] = getXY(e);

        if (!isDragging) {
            const handleInfo = getHandle(x, y);
            currentHandle = handleInfo.handle;
            activeCropBox = handleInfo.box;

            // Update cursor based on handle
            updateCursor(currentHandle);

            // check if green highlight should be shown
            const wasMovable = movableBoxes;
            updatemovableBoxes(currentHandle);
            const changeActive = movableBoxes.left !== wasMovable.left || movableBoxes.right !== wasMovable.right;
            const leftBoxHighlight = (movableBoxes.left && changeActive);
            const rightBoxHighlight = (movableBoxes.right && changeActive);
            drawCropInterface(leftBoxHighlight, rightBoxHighlight);
        } else {
            const deltaX = x - dragStartX;
            const deltaY = y - dragStartY;
            dragStartX = x;
            dragStartY = y;

            updateCropBoxes(currentHandle, activeCropBox, deltaX, deltaY);
            drawCropInterface();
        }
    }

    function onMouseUp(e) {
        if (isCropping && isDragging) {
            isDragging = false;
            // update cursor and cropbox movable state
            onMouseMove(e);
            document.documentElement.style.cursor = 'default';
        }
    }


    // Track which boxes can move with current crop boundaries
    let movableBoxes = { left: false, right: false };

    function updatemovableBoxes(handle) {
        // Reset movable boxes
        movableBoxes = { left: false, right: false };

        if (handle === 'inside' || handle == 'outside') {
            // For moves, we need to check if boxes can actually move
            const leftCanMove = canBoxMove(cropBoxes.left, 'left');
            const rightCanMove = canBoxMove(cropBoxes.right, 'right');
            const bothCanMove = leftCanMove.canMoveHorizontally && rightCanMove.canMoveHorizontally
                                || leftCanMove.canMoveVertically && rightCanMove.canMoveVertically;

            if (handle === 'inside') {
                // Check if the active box can move
                if (activeCropBox === 'left') {
                    movableBoxes = { left: leftCanMove.canMove, right: false };
                } else {
                    movableBoxes = { left: false, right: rightCanMove.canMove };
                }
            } else if (handle = 'outside') {
                // Check if both boxes are movable
                movableBoxes = { left: bothCanMove, right: bothCanMove };
            }
        } else {
            // For resize operations, both boxes are always movable
            // No need to check movement capability for resize operations
            movableBoxes.left = true;
            movableBoxes.right = true;
        }
    }
    
    function updateCropBoxes(handle, activeBox, deltaX, deltaY) {
        const img1Width = window.images[0].width * currentScale;
        const img1Height = window.images[0].height * currentScale;
        const img2Width = window.images[1].width * currentScale;
        const img2Height = window.images[1].height * currentScale;
        
        // Calculate right image starting position
        const rightImgStart = img1Width + (currentParams ? currentParams.renderGap : 0);
        
        // Store original values before modifications
        const otherBox = activeBox === 'left' ? 'right' : 'left';
        
        // Create copies to simulate changes without affecting the actual boxes yet
        const testActiveBox = { ...cropBoxes[activeBox] };
        const testOtherBox = { ...cropBoxes[otherBox] };
        
        if (handle === 'outside') {
            // If moving both boxes, enforce limits of both boxes
            // First try moving the active box and get actual deltas (might be limited by boundaries)
            const activeResult = moveBox(testActiveBox, deltaX, deltaY, 
                    activeBox === 'left' ? 0 : rightImgStart,
                    activeBox === 'left' ? img1Width : img2Width,
                    activeBox === 'left' ? img1Height : img2Height);
            
            // Now try moving the other box by the same actual deltas
            const otherResult = moveBox(testOtherBox, activeResult.x, activeResult.y, 
                    otherBox === 'left' ? 0 : rightImgStart,
                    otherBox === 'left' ? img1Width : img2Width,
                    otherBox === 'left' ? img1Height : img2Height);
            
            // If other box couldn't move the full amount, we need to limit both boxes
            // Move active box only by the amount the other box could move
            if (otherResult.x !== activeResult.x || otherResult.y !== activeResult.y) {
                // Reset test active box
                testActiveBox.x = cropBoxes[activeBox].x;
                testActiveBox.y = cropBoxes[activeBox].y;
                
                // Move active box only by the amount the other box could move
                moveBox(testActiveBox, otherResult.x, otherResult.y,
                        activeBox === 'left' ? 0 : rightImgStart,
                        activeBox === 'left' ? img1Width : img2Width,
                        activeBox === 'left' ? img1Height : img2Height);
            }
            
            // Apply changes to both real boxes
            cropBoxes[activeBox].x = testActiveBox.x;
            cropBoxes[activeBox].y = testActiveBox.y;
            cropBoxes[otherBox].x = testOtherBox.x;
            cropBoxes[otherBox].y = testOtherBox.y;
        } else if (handle == 'inside') {
            // Only move the active box
            moveBox(cropBoxes[activeBox], deltaX, deltaY, 
                    activeBox === 'left' ? 0 : rightImgStart,
                    activeBox === 'left' ? img1Width : img2Width,
                    activeBox === 'left' ? img1Height : img2Height);
        } else {
            // Resize operation
            
            // Store the original dimensions
            const originalActiveWidth = testActiveBox.width;
            const originalActiveHeight = testActiveBox.height;
            const originalActiveX = testActiveBox.x;
            const originalActiveY = testActiveBox.y;
            
            // Simulate update on the test active box
            updateSingleBox(testActiveBox, handle, deltaX, deltaY, 
                            activeBox === 'left' ? 0 : rightImgStart,
                            activeBox === 'left' ? img1Width : img2Width,
                            activeBox === 'left' ? img1Height : img2Height);
            
            // Calculate changes in dimensions and position
            const widthChange = testActiveBox.width - originalActiveWidth;
            const heightChange = testActiveBox.height - originalActiveHeight;
            const xChange = testActiveBox.x - originalActiveX;
            const yChange = testActiveBox.y - originalActiveY;
            
            // Apply the same type of changes to the test other box
            
            // Handle x position changes (left edge)
            if (['topLeft', 'leftMiddle', 'bottomLeft'].includes(handle)) {
                testOtherBox.x += xChange;
                testOtherBox.width -= xChange; // Compensate width for left edge movement
            }
            
            // Handle y position changes (top edge)
            if (['topLeft', 'topMiddle', 'topRight'].includes(handle)) {
                testOtherBox.y += yChange;
                testOtherBox.height -= yChange; // Compensate height for top edge movement
            }
            
            // Handle width changes (right edge)
            if (['topRight', 'rightMiddle', 'bottomRight'].includes(handle)) {
                testOtherBox.width += widthChange;
            }
            
            // Handle height changes (bottom edge)
            if (['bottomLeft', 'bottomMiddle', 'bottomRight'].includes(handle)) {
                testOtherBox.height += heightChange;
            }
            
            // Check if both test boxes would be valid after the resize
            if (!isBoxInBounds(testActiveBox, activeBox === 'left' ? 0 : rightImgStart,
                              activeBox === 'left' ? img1Width : img2Width,
                              activeBox === 'left' ? img1Height : img2Height) ||
                !isBoxInBounds(testOtherBox, otherBox === 'left' ? 0 : rightImgStart,
                              otherBox === 'left' ? img1Width : img2Width,
                              otherBox === 'left' ? img1Height : img2Height)) {
                // If either box would be out of bounds, don't allow the resize
                return;
            }
            
            // If we reach here, the resize is valid for both boxes
            // Apply the changes to the real boxes
            cropBoxes[activeBox] = testActiveBox;
            cropBoxes[otherBox] = testOtherBox;
        }
        
        // Final validation to ensure boxes stay within bounds
        validateCropBoxes();
    }

    // Small tolerance value
    const epsilon = 0.001;
    // Helper function to check if a box is within bounds
    function isBoxInBounds(box, minX, maxWidth, maxHeight) {
        const minSize = handleSize * 2;
        
        // Check all constraints
        if (box.x < minX - epsilon) return false;
        if (box.y < -epsilon) return false;
        if (box.width < minSize - epsilon) return false;
        if (box.height < minSize - epsilon) return false;
        if (box.x + box.width > minX + maxWidth + epsilon) return false;
        if (box.y + box.height > maxHeight + epsilon) return false;
        
        return true;
    }
    
    function moveBox(box, deltaX, deltaY, minX, maxWidth, maxHeight) {
        // Calculate new position
        const newX = Math.max(minX, Math.min(box.x + deltaX, minX + maxWidth - box.width));
        const newY = Math.max(0, Math.min(box.y + deltaY, maxHeight - box.height));
        
        // Calculate actual change applied
        const actualDeltaX = newX - box.x;
        const actualDeltaY = newY - box.y;
        
        // Apply the changes
        box.x = newX;
        box.y = newY;
        
        // Return actual changes applied (might be different from requested due to constraints)
        return { x: actualDeltaX, y: actualDeltaY };
    }

    function canBoxMove(box, boxType) {
        // Determine if a box has any room to move in any direction
        const minX = boxType === 'left' ? 0 : (currentParams ? currentParams.img1Width + currentParams.renderGap : 0);
        const maxWidth = boxType === 'left' ? 
                         window.images[0].width * currentScale : 
                         window.images[1].width * currentScale;
        const maxHeight = boxType === 'left' ? 
                          window.images[0].height * currentScale : 
                          window.images[1].height * currentScale;
        
        // Check if there's room to move in any direction
        const hasRoomLeft = box.x > minX + epsilon;
        const hasRoomRight = box.x + box.width < minX + maxWidth - epsilon;
        const hasRoomUp = box.y > epsilon;
        const hasRoomDown = box.y + box.height < maxHeight - epsilon;
    
        const canMoveHorizontally = hasRoomLeft || hasRoomRight;
        const canMoveVertically = hasRoomUp || hasRoomDown;
        const canMove = canMoveHorizontally || canMoveVertically;

        return {
            canMoveHorizontally,
            canMoveVertically,
            canMove
        };
    }

    function updateSingleBox(box, handle, deltaX, deltaY, minX, maxWidth, maxHeight) {
        const minSize = handleSize * 2;
        
        switch (handle) {
            case 'topLeft':
                // Adjust x position and width
                const newX = Math.max(minX, Math.min(box.x + deltaX, box.x + box.width - minSize));
                const widthChange = box.x - newX;
                box.x = newX;
                box.width += widthChange;
                
                // Adjust y position and height
                const newY = Math.max(0, Math.min(box.y + deltaY, box.y + box.height - minSize));
                const heightChange = box.y - newY;
                box.y = newY;
                box.height += heightChange;
                break;
                
            case 'topRight':
                // Adjust width
                box.width = Math.max(minSize, Math.min(box.width + deltaX, minX + maxWidth - box.x));
                
                // Adjust y position and height
                const topRightNewY = Math.max(0, Math.min(box.y + deltaY, box.y + box.height - minSize));
                const topRightHeightChange = box.y - topRightNewY;
                box.y = topRightNewY;
                box.height += topRightHeightChange;
                break;
                
            case 'bottomLeft':
                // Adjust x position and width
                const bottomLeftNewX = Math.max(minX, Math.min(box.x + deltaX, box.x + box.width - minSize));
                const bottomLeftWidthChange = box.x - bottomLeftNewX;
                box.x = bottomLeftNewX;
                box.width += bottomLeftWidthChange;
                
                // Adjust height
                box.height = Math.max(minSize, Math.min(box.height + deltaY, maxHeight - box.y));
                break;
                
            case 'bottomRight':
                // Adjust width and height
                box.width = Math.max(minSize, Math.min(box.width + deltaX, minX + maxWidth - box.x));
                box.height = Math.max(minSize, Math.min(box.height + deltaY, maxHeight - box.y));
                break;
                
            case 'topMiddle':
                // Adjust y position and height
                const topMiddleNewY = Math.max(0, Math.min(box.y + deltaY, box.y + box.height - minSize));
                const topMiddleHeightChange = box.y - topMiddleNewY;
                box.y = topMiddleNewY;
                box.height += topMiddleHeightChange;
                break;
                
            case 'rightMiddle':
                // Adjust width
                box.width = Math.max(minSize, Math.min(box.width + deltaX, minX + maxWidth - box.x));
                break;
                
            case 'bottomMiddle':
                // Adjust height
                box.height = Math.max(minSize, Math.min(box.height + deltaY, maxHeight - box.y));
                break;
                
            case 'leftMiddle':
                // Adjust x position and width
                const leftMiddleNewX = Math.max(minX, Math.min(box.x + deltaX, box.x + box.width - minSize));
                const leftMiddleWidthChange = box.x - leftMiddleNewX;
                box.x = leftMiddleNewX;
                box.width += leftMiddleWidthChange;
                break;
        }
    }
    
    function applyCrop() {
        // Store the right image starting position for reference
        const rightImgStart = currentParams.img1Width + currentParams.renderGap;
        
        // Save the current crop state before applying
        lastCropState = {
            leftBox: { ...cropBoxes.left },
            rightBox: { ...cropBoxes.right },
            scale: currentScale,
            rightImgStart: rightImgStart // Store this for future reference
        };
        
        // Calculate the crop in original image coordinates
        const cropLeft = {
            x: Math.round(cropBoxes.left.x / currentScale),
            y: Math.round(cropBoxes.left.y / currentScale),
            width: Math.round(cropBoxes.left.width / currentScale),
            height: Math.round(cropBoxes.left.height / currentScale)
        };
        
        const cropRight = {
            x: Math.round((cropBoxes.right.x - rightImgStart) / currentScale),
            y: Math.round(cropBoxes.right.y / currentScale),
            width: Math.round(cropBoxes.right.width / currentScale),
            height: Math.round(cropBoxes.right.height / currentScale)
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
                
                // Exit crop mode
                isCropping = false;
                applyCropButton.style.display = 'none';
                cancelCropButton.style.display = 'none';
                cropButton.style.display = 'block';
                resetCropButton.style.display = 'block';

                // Calculate a good scale for the cropped image
                const optimalScale = window.calculateOptimalScale(window.images[0], window.images[1]);
                window.setScale(optimalScale);

                // Redraw with cropped images
                window.drawImages();
            };
            newImg2.src = tempCanvas2.toDataURL();
        };
        newImg1.src = tempCanvas1.toDataURL();
    }

    function cancelCrop() {
        isCropping = false;
        applyCropButton.style.display = 'none';
        cancelCropButton.style.display = 'none';
        cropButton.style.display = 'block';

        // Restore previously cropped images if this was a subsequent crop operation
        if (tempCroppedImages) {
            window.images[0] = tempCroppedImages[0];
            window.images[1] = tempCroppedImages[1];
            tempCroppedImages = null;
        }

        // Restore the pre-crop scale
        restorePreCropScale();

        // Redraw the images without crop overlay
        window.drawImages();
    }

    function onSwap() {
        if (originalImages) {
            [originalImages[0], originalImages[1]] = [originalImages[1], originalImages[0]];
        }
        if (tempCroppedImages) {
            [tempCroppedImages[0], tempCroppedImages[1]] = [tempCroppedImages[1], tempCroppedImages[0]];
        }

        [movableBoxes.left, movableBoxes.right] = [movableBoxes.right, movableBoxes.left];
        if (activeCropBox !== null ) activeCropBox = activeCropBox === 'left' ? 'right' : 'left';

        if (isCropping) {
            const rightImgStart = currentParams.img1Width + currentParams.renderGap;
            [cropBoxes.left, cropBoxes.right] = [cropBoxes.right, cropBoxes.left];
            cropBoxes.left.x -= rightImgStart;
            cropBoxes.right.x += rightImgStart;
            drawCropInterface();
        } else {
            if (lastCropState) {
                [lastCropState.leftBox, lastCropState.rightBox] = [lastCropState.rightBox, lastCropState.leftBox];
                lastCropState.leftBox.x -= lastCropState.rightImgStart;
                lastCropState.rightBox.x += lastCropState.rightImgStart;
            }
            drawImages();
        }
    }

    function onGapChange(oldGap, newGap) {
        cropBoxes.right.x += (newGap - oldGap)*currentScale;
        drawCropInterface();
    }

    function onScaleChange(newScale) {
        if (!isCropping) return;
        
        // Calculate the scale ratio between old and new scale
        const scaleRatio = newScale / currentScale;
        
        // Adjust both crop boxes
        cropBoxes.left.x *= scaleRatio;
        cropBoxes.left.y *= scaleRatio;
        cropBoxes.left.width *= scaleRatio;
        cropBoxes.left.height *= scaleRatio;
        
        cropBoxes.right.x *= scaleRatio;
        cropBoxes.right.y *= scaleRatio;
        cropBoxes.right.width *= scaleRatio;
        cropBoxes.right.height *= scaleRatio;
        
        // Update current scale
        currentScale = newScale;
        
        // Redraw with updated boxes
        drawCropInterface();
    }
    
    function restorePreCropScale() {
        // Restore the pre-crop scale if it exists
        if (preCropScale !== 0) {
            window.setScale(preCropScale);
            preCropScale = 0;
        }
    }

    function resetCrop() {
        if (originalImages) {
            isCropping = false;

            // Restore original images if images are currently being displayed
            if (window.images.length == 2) {
                window.images[0] = originalImages[0].cloneNode(true);
                window.images[1] = originalImages[1].cloneNode(true);
                // reset scale to what it was before first crop
                window.setScale(originalScale);
                // Redraw with original images
                window.drawImages();
            }
            
            // Reset original images array and last crop state
            originalImages = null;
            originalScale = 0;
            lastCropState = null;
            tempCroppedImages = null;
            activeCropBox = null;
            movableBoxes = { left: false, right: false };

            // Hide reset crop button
            resetCropButton.style.display = 'none';
            applyCropButton.style.display = 'none';
            cancelCropButton.style.display = 'none';
            cropButton.style.display = 'block';
        }
    }

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
        const canvasContainer = document.getElementById('canvasContainer');
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
        
        // Fullscreen toggle function
        function toggleFullscreen(element) {
            if (!document.fullscreenElement && 
                !document.mozFullScreenElement && 
                !document.webkitFullscreenElement && 
                !document.msFullscreenElement) {
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
                fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7"></path></svg>';
                setTimeout(() => {
                    // console.log("tfs");
                    window.onResize();
                }, 250);            
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
                fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
                setTimeout(() => {
                    // console.log("ffs");
                    window.onResize();
                }, 250);            
            }
        }
        
        // Listen for fullscreen change events to update button
        document.addEventListener('fullscreenchange', updateFullscreenButton);
        document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
        document.addEventListener('mozfullscreenchange', updateFullscreenButton);
        document.addEventListener('MSFullscreenChange', updateFullscreenButton);
        
        function updateFullscreenButton() {
            if (document.fullscreenElement || 
                document.webkitFullscreenElement || 
                document.mozFullScreenElement || 
                document.msFullscreenElement) {
                // In fullscreen mode
                fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7"></path></svg>';
            } else {
                // Not in fullscreen mode
                fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
            }
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

    // Initialize fullscreen option
    addFullscreenOption();


    // Arrow key navigation state
    let arrowKeyMultiplier = 1;     // Default step size multiplier

    // Arrow key navigation handlers
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function nextTab() {
        if (currentHandle === 'outside') {
            currentHandle = 'inside';
            activeCropBox = 'left';
        } else if (activeCropBox === 'left') {
            activeCropBox = 'right';
        } else {
            currentHandle = 'outside';
            activeCropBox = 'left';
        }
        updatemovableBoxes(currentHandle);
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
        }

        if (!isCropping) return;

        if (activeCropBox === null) {
            activeCropBox = 'left'
        }
        let deltaX = 0;
        let deltaY = 0;
        
        // Set multiplier for Shift key (faster movement)
        arrowKeyMultiplier = e.shiftKey ? 5 : 1;
        
        // Handle arrow keys
        switch (e.key) {
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

                // check if green highlight should be shown
                const wasMovable = movableBoxes;
                nextTab();
                if (!movableBoxes.left && !movableBoxes.right) {
                    nextTab();
                    if (!movableBoxes.left && !movableBoxes.right) {
                        nextTab();
                    }
                }
                const changeActive = movableBoxes.left !== wasMovable.left || movableBoxes.right !== wasMovable.right;
                const leftBoxHighlight = (movableBoxes.left && changeActive);
                const rightBoxHighlight = (movableBoxes.right && changeActive);
                drawCropInterface(leftBoxHighlight, rightBoxHighlight);
                return;
            default:
                return; // Ignore other keys
        }
        
        // If we have movement, apply it
        if (deltaX !== 0 || deltaY !== 0) {
            // Set up for movement
            updateCropBoxes(currentHandle, activeCropBox, deltaX, deltaY);
            
            // Redraw the interface
            drawCropInterface();
        }
    }

    function onKeyUp(e) {
        if (!isCropping) return;
        
        // Reset multiplier on Shift key release
        if (e.key === 'Shift') {
            arrowKeyMultiplier = 1;
        }
    }

// // For the arrow key active box, highlight it differently
// const leftStrokeStyle = arrowKeyBox === 'left' 
//     ? (movableBoxes.left ? '#33ff33' : '#ffcc00') // Brighter when active
//     : (movableBoxes.left ? '#33cc33' : '#ff9900');
    
// const rightStrokeStyle = arrowKeyBox === 'right'
//     ? (movableBoxes.right ? '#33ff33' : '#ffcc00') // Brighter when active
//     : (movableBoxes.right ? '#33cc33' : '#ff9900');

// // Add arrow key instructions if in crop mode
// if (isCropping) {
//     ctx.font = '12px Arial';
//     ctx.fillStyle = 'white';
//     ctx.textAlign = 'left';
//     ctx.fillText('Arrow keys: Move box 1px', 10, canvas.height - 50);
//     ctx.fillText('Shift+Arrow: Move box 5px', 10, canvas.height - 35);
//     ctx.fillText('Tab: Switch active box', 10, canvas.height - 20);
    
//     // Show which box is active for arrow keys
//     ctx.textAlign = 'right';
//     ctx.fillText(`Active: ${arrowKeyBox.toUpperCase()} box`, canvas.width - 10, canvas.height - 20);
// }

// // Reset arrow key state
// arrowKeyBox = 'left';
// arrowKeyMultiplier = 1;

// function addKeyboardHelpMessage() {
//     const helpDiv = document.createElement('div');
//     helpDiv.id = 'cropKeyboardHelp';
//     helpDiv.className = 'crop-help';
//     helpDiv.innerHTML = `
//         <p><strong>Keyboard Controls</strong></p>
//         <ul>
//             <li><kbd>Arrow Keys</kbd>: Move crop box 1px</li>
//             <li><kbd>Shift</kbd> + <kbd>Arrow Keys</kbd>: Move crop box 5px</li>
//             <li><kbd>Tab</kbd>: Switch between left/right crop box</li>
//         </ul>
//     `;
//     // ...styling and event handlers...
// }

// Add these variables at the top of your file with other state variables
let glowStartTime = 0;
const GLOW_DURATION = 800; // Slightly longer duration for more visibility
let glowAnimationActive = false;
let glowAnimationFrameId = null;

// Modified drawCropInterface function that accepts activation flags
function drawCropInterface(leftBoxHighlight = false, rightBoxHighlight = false) {
    // Start glow animation if any box went active
    if (leftBoxHighlight || rightBoxHighlight) {
        startGlowAnimation();
    }
    
    // Get the main canvas context
    const ctx = canvas.getContext('2d');
    
    // First draw the images (using the main draw function)
    currentParams = window.drawImages();

    // Calculate image dimensions and positions
    const img1Width = window.images[0].width * currentScale;
    const img1Height = window.images[0].height * currentScale;
    const rightImgStart = img1Width + (currentParams ? currentParams.renderGap : 0);
    const img2Width = window.images[1].width * currentScale;
    const img2Height = window.images[1].height * currentScale;
    
    // Draw semi-transparent overlay for areas outside the crop boxes
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    const leftBox = cropBoxes.left;
    const rightBox = cropBoxes.right;
    
    // Left image overlay
    // Top rectangle
    ctx.fillRect(0, 0, img1Width, leftBox.y);
    // Left rectangle
    ctx.fillRect(0, leftBox.y, leftBox.x, leftBox.height);
    // Right rectangle
    ctx.fillRect(leftBox.x + leftBox.width, leftBox.y, img1Width - (leftBox.x + leftBox.width), leftBox.height);
    // Bottom rectangle
    ctx.fillRect(0, leftBox.y + leftBox.height, img1Width, img1Height - (leftBox.y + leftBox.height));
    
    // Right image overlay
    // Top rectangle
    ctx.fillRect(rightImgStart, 0, img2Width, rightBox.y);
    // Left rectangle
    ctx.fillRect(rightImgStart, rightBox.y, rightBox.x - rightImgStart, rightBox.height);
    // Right rectangle
    ctx.fillRect(rightBox.x + rightBox.width, rightBox.y, (rightImgStart + img2Width) - (rightBox.x + rightBox.width), rightBox.height);
    // Bottom rectangle
    ctx.fillRect(rightImgStart, rightBox.y + rightBox.height, img2Width, img2Height - (rightBox.y + rightBox.height));
    
// Calculate glow intensity if animation is active
let glowIntensity = 0;
let glowOffset = 0;
let greenIntensity = 0; // For color transition

if (glowAnimationActive) {
    const elapsed = performance.now() - glowStartTime;
    if (elapsed < GLOW_DURATION) {
        // Use a better curve for fast rise and very gradual decay
        const normalizedTime = elapsed / GLOW_DURATION;
        
        if (normalizedTime < 0.2) {
            // Fast rise phase (first 20% of time) - quick ramp up to full intensity
            const t = normalizedTime / 0.2;
            // Accelerate to max faster with cubic curve
            glowIntensity = 30 * (t * t * (3 - 2 * t)); // Smoothstep function
            glowOffset = 2 * (t * t * (3 - 2 * t));
            greenIntensity = t * t * (3 - 2 * t); // Same smoothstep for color
        } else {
            // Long decay phase (remaining 80% of time) - very gradual falloff
            const t = (normalizedTime - 0.2) / 0.8;
            // Use a very gradual falloff curve
            // Adjusted exponent for even smoother falloff
            glowIntensity = 30 * Math.pow(1 - t, 3);
            glowOffset = 2 * Math.pow(1 - t, 3);
            greenIntensity = Math.pow(1 - t, 3); // Same curve for color
        }
    } else {
        // Animation time is complete
        glowIntensity = 0;
        glowOffset = 0;
        greenIntensity = 0;
    }
}

// Draw crop borders

// Left crop box border
if (movableBoxes.left) {
    // Green, movable box - apply animation effects if active
    if (glowAnimationActive) {
        // Set line width with smooth transition
        ctx.lineWidth = 2 + glowOffset;
        
        // Create a color that transitions smoothly between regular and bright green
        const r = Math.round(51 + (74 - 51) * greenIntensity);  // 33cc33 to 4AFF4A
        const g = Math.round(204 + (255 - 204) * greenIntensity);
        const b = Math.round(51 + (74 - 51) * greenIntensity);
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        
        // Set shadow with current intensity
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.shadowBlur = glowIntensity;
    } else {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#33cc33'; // Regular green
        ctx.shadowBlur = 0;
    }
} else {
    // Orange, non-movable box - no animation effects
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff9900'; // Orange
    ctx.shadowBlur = 0;
}

ctx.strokeRect(leftBox.x, leftBox.y, leftBox.width, leftBox.height);
ctx.shadowBlur = 0; // Reset shadow

// Draw handles with current stroke style
drawHandles(ctx, leftBox);

// Right crop box border
if (movableBoxes.right) {
    // Green, movable box - apply animation effects if active
    if (glowAnimationActive) {
        // Set line width with smooth transition
        ctx.lineWidth = 2 + glowOffset;
        
        // Create a color that transitions smoothly between regular and bright green
        const r = Math.round(51 + (74 - 51) * greenIntensity);  // 33cc33 to 4AFF4A
        const g = Math.round(204 + (255 - 204) * greenIntensity);
        const b = Math.round(51 + (74 - 51) * greenIntensity);
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        
        // Set shadow with current intensity
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.shadowBlur = glowIntensity;
    } else {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#33cc33'; // Regular green
        ctx.shadowBlur = 0;
    }
} else {
    // Orange, non-movable box - no animation effects
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff9900'; // Orange
    ctx.shadowBlur = 0;
}

    ctx.strokeRect(rightBox.x, rightBox.y, rightBox.width, rightBox.height);
    ctx.shadowBlur = 0; // Reset shadow
    
    // Draw handles with current stroke style
    drawHandles(ctx, rightBox);
    
    // Reset line width to default
    ctx.lineWidth = 2;
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
    animateGlow();
}

// Animation loop function - separate from drawCropInterface
function animateGlow() {
    const elapsed = performance.now() - glowStartTime;
    
    if (elapsed < GLOW_DURATION && glowAnimationActive) {
        // Continue the animation
        glowAnimationFrameId = requestAnimationFrame(animateGlow);
        
        // Call drawCropInterface without activation flags
        drawCropInterface(false, false);
    } else {
        // Stop the animation
        stopGlowAnimation();
        
        // Final render with no glow
        drawCropInterface(false, false);
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

// Add this function to clean up animations when necessary
function cleanupGlowAnimation() {
    stopGlowAnimation();
}

// Helper to make the start of the crop more prominent
const originalStartCrop = startCrop;
startCrop = function() {
    originalStartCrop();
    // Start with a small delay to ensure movableBoxes are set
    setTimeout(() => {
        startGlowAnimation();
    }, 100);
};

    // Expose functions to global scope and the isCropping flag
    window.cropModule = {
        // startCrop,
        // applyCrop,
        // cancelCrop,
        resetCrop,
        onScaleChange,
        onGapChange,
        onSwap,
        isCropping: function() { return isCropping; }
    }
});