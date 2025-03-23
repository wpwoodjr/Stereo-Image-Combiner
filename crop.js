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
    // Original scale before any cropping
    let originalScale = 0;
    // Scale prior to entering crop mode
    let preCropScale = 0;
    
    // Track which box was interacted with first (for highlighting)
    let primaryBox = null;
    let isDragging = false;

    // Handle sizes
    const handleSize = 14;
    
    // Selected handle
    let selectedHandle = null;
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
    
    // =========================
    // Functions
    // =========================

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
        primaryBox = null;  // Reset primary box for this crop session
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
        drawCropInterface();
    }
    
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
        
        // No longer forcing Y positions to match
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
            return { handle: leftHandle, box: 'left', otherBox: 'right' };
        }
        
        // Check if the mouse is over any handle of the right crop box
        const rightBox = cropBoxes.right;
        const rightHandle = getHandleForBox(rightBox, x, y);
        if (rightHandle) {
            return { handle: rightHandle, box: 'right', otherBox: 'left' };
        }
        
        return null;
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
    
    function updateCursor(handleInfo) {
        if (!handleInfo) {
            canvas.style.cursor = 'default';
            return;
        }
        
        switch (handleInfo.handle) {
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
                canvas.style.cursor = 'move';
                break;
            default:
                canvas.style.cursor = 'default';
        }
    }

    function onMouseDown(e) {
        if (!isCropping) return;
        
        // Get mouse position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if a handle is selected
        const handleInfo = getHandle(x, y);
        
        if (handleInfo) {
            selectedHandle = handleInfo.handle;
            activeCropBox = handleInfo.box;
            otherCropBox = handleInfo.otherBox;
            dragStartX = x;
            dragStartY = y;
            isDragging = true;
            
            // Set primary box if this is the first inside drag operation
            if (primaryBox === null && selectedHandle === 'inside') {
                // only set the primary box if both boxes can move
                if (movableBoxes.left && movableBoxes.right) {
                    primaryBox = activeCropBox;
                }
            }
        } else {
            // Clicked outside of any handle - deselect
            selectedHandle = null;
            activeCropBox = null;
        }
        // Redraw to reflect movable boxes
        drawCropInterface();
    }
    
    function onMouseUp(e) {
        isDragging = false;
        selectedHandle = null;
        activeCropBox = null;
    }

    function onMouseMove(e) {
        if (!isCropping) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Update cursor based on handle
        if (!isDragging) {
            const handleInfo = getHandle(x, y);
            updateCursor(handleInfo);
            
            // Update movable boxes for hover state
            if (handleInfo) {
                selectedHandle = handleInfo.handle;
                activeCropBox = handleInfo.box;
                updatemovableBoxes();
            } else {
                selectedHandle = null;
                activeCropBox = null;
                movableBoxes = { left: false, right: false };
            }

        // If dragging, update crop boxes
        } else if (activeCropBox) {
            const deltaX = x - dragStartX;
            const deltaY = y - dragStartY;
            
            // Update crop boxes
            updateCropBoxes(selectedHandle, activeCropBox, deltaX, deltaY);
            
            // Update drag start position
            dragStartX = x;
            dragStartY = y;
        }
            
        // Redraw the crop interface
        drawCropInterface();
    }
    
    // Track which boxes can move with current crop boundaries
    let movableBoxes = { left: false, right: false };

    function updatemovableBoxes() {
        // Reset movable boxes
        movableBoxes = { left: false, right: false };
        
        if (!activeCropBox || !selectedHandle) return;
        
        if (selectedHandle === 'inside') {
            // For inside moves, we need to check if boxes can actually move
            const leftCanMove = canBoxMove(cropBoxes.left, 'left');
            const rightCanMove = canBoxMove(cropBoxes.right, 'right');
            const bothCanMove = leftCanMove.canMoveHorizontally && rightCanMove.canMoveHorizontally
                                || leftCanMove.canMoveVertically && rightCanMove.canMoveVertically;

            if (primaryBox === null) {
                // If no primary box is set, check if both boxes can move, or just the active one
                if (activeCropBox === 'left') {
                    movableBoxes.left = leftCanMove.canMove;
                    movableBoxes.right = bothCanMove;
                } else {
                    movableBoxes.left = bothCanMove;
                    movableBoxes.right = rightCanMove.canMove;
                }
            } else if (activeCropBox === primaryBox) {
                // If moving primary box, both boxes are movable only if they both can move
                movableBoxes = { left: bothCanMove, right: bothCanMove };
                // Reset primary box if we get back to a no-move situation
                if (!bothCanMove) primaryBox = null;
            } else {
                // If moving non-primary box, it is movable if it can move horizontally or vertically
                movableBoxes[activeCropBox] = activeCropBox === 'left' ? leftCanMove.canMove : rightCanMove.canMove;
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
        const originalLeft = { ...cropBoxes.left };
        const originalRight = { ...cropBoxes.right };
        const otherBox = activeBox === 'left' ? 'right' : 'left';
        
        // Create copies to simulate changes without affecting the actual boxes yet
        const testActiveBox = { ...cropBoxes[activeBox] };
        const testOtherBox = { ...cropBoxes[otherBox] };
        
        if (handle === 'inside') {
            // If moving the primary box, move both boxes and enforce limits
            if (activeBox === primaryBox) {
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
            } else {
                // Only move the active box
                moveBox(cropBoxes[activeBox], deltaX, deltaY, 
                        activeBox === 'left' ? 0 : rightImgStart,
                        activeBox === 'left' ? img1Width : img2Width,
                        activeBox === 'left' ? img1Height : img2Height);
            }
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
    
    // Helper function to check if a box is within bounds
    function isBoxInBounds(box, minX, maxWidth, maxHeight) {
        const minSize = handleSize * 2;
        
        // Check all constraints
        if (box.x < minX) return false;
        if (box.y < 0) return false;
        if (box.width < minSize) return false;
        if (box.height < minSize) return false;
        if (box.x + box.width > minX + maxWidth) return false;
        if (box.y + box.height > maxHeight) return false;
        
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
        const epsilon = 0.001; // Small tolerance value

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
                window.setScale(optimalScale / 100);

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
            tempCroppedImages = null
            
            // Hide reset crop button
            resetCropButton.style.display = 'none';

            isCropping = false;
            applyCropButton.style.display = 'none';
            cancelCropButton.style.display = 'none';
            cropButton.style.display = 'block';
        }
    }
    
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