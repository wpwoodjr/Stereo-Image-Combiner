# Stereo Image Combiner: Detailed Application Specification

## Overview

Stereo Image Combiner is an application for combining two images side by side with customizable positioning, alignment, and visual settings. It's particularly designed for creating stereoscopic image pairs that can be viewed with cross-eye or parallel viewing techniques.

The application works entirely client-side, processing images locally without any server requirements. All functionality happens in the browser (for web implementations) or within the application (for desktop implementations).

## Core Features

1. **Image Loading**
   - Load two images via drag-and-drop or file browser
   - Support for common image formats (JPG, PNG, GIF, etc.)
   - Visual dropzone with informative prompt messages

2. **Image Display**
   - Side-by-side display of the two images with a customizable gap
   - Adjustable preview scale (for display only, not affecting final output)
   - Visual indication of current image names/filenames

3. **Basic Controls**
   - Swap left and right images
   - Adjust gap width between images (0-20% of average image width)
   - Choose the color of the gap
   - Scale slider to adjust the display size

4. **Advanced Cropping System**
   - Synchronized cropping of both images with identical dimensions
   - Crop box handles for resizing
   - Interactive positioning of images within crop frames
   - Movement constraints (horizontal-only option)
   - Toggle between alignment mode and side-by-side mode

5. **Alignment Mode**
   - Overlay view to precisely align features in both images
   - Inverse grayscale transformation to highlight differences/similarities
   - Fine-grained positioning with magnification for better precision

6. **Export Options**
   - Save as PNG (lossless) or JPG (with quality control)
   - Automatic filename generation based on source image names
   - Optional custom filename prefix

7. **Keyboard Shortcuts**
   - Fullscreen toggle (`f`)
   - Image swap (`x`)
   - Alignment mode toggle (`a`)
   - Horizontal-only movement toggle (`h`)
   - Tab selection cycling between image controls
   - Arrow keys for precise positioning

8. **Help System**
   - Comprehensive help documentation
   - Keyboard shortcut (`?`) to access help
   - Tabbed interface for different help topics

9. **Persistent Settings**
   - Save user preferences locally
   - Remember settings between sessions

## User Interface Layout

### Main Layout

- **Header Section**
  - Application title
  - Help icon button (right side)
  - GitHub repository link (far right)

- **Two-Panel Layout**
  - Left panel: Controls and settings
  - Right panel: Image display and dropzone

### Left Panel (Controls)

1. **Image Operations**
   - "Swap Images (x)" button
   - "Crop Images" button (appears when images are loaded)
   - "Apply Crop" button (appears in crop mode)
   - "Cancel" button (appears in crop mode)
   - "Reset Crop" button (appears after cropping)

2. **Display Settings**
   - Scale slider (with percentage display)
   - Gap width slider (with percentage display)
   - Gap color picker

3. **Crop Options** (visible in crop mode)
   - "Align Mode (a)" checkbox
   - "Horizontal Only (h)" checkbox
   - "Draw Boxes" checkbox

4. **Export Controls**
   - "Save Image" button
   - Filename prefix text input
   - Format selection dropdown (JPG/PNG)
   - Quality slider (for JPG only)

### Right Panel (Display Area)

1. **Image Information Bar**
   - Left image name (left-aligned)
   - Right image name (right-aligned)

2. **Canvas Container**
   - Main canvas for displaying images
   - Fullscreen toggle button (top-right corner)

3. **Dropzone** (shown when no images are loaded)
   - Instructional message
   - Hidden file input for browser selection

## Detailed Component Specifications

### Image Loading and Display

1. **Dropzone**
   - Accept drag-and-drop of two image files
   - Change appearance on drag-over for user feedback
   - Show alternative message during drag
   - Click to open native file browser

2. **Canvas Display**
   - Adaptively sized based on loaded images and available viewport
   - Maintains aspect ratio of original images
   - Supports dynamic resizing when browser window changes
   - Fullscreen mode with optimized display

3. **Image Information**
   - Shows filenames of both loaded images
   - Updates when images are swapped

### Controls Implementation

1. **Scale Control**
   - Range slider: 1-100%
   - Affects display size only, not output resolution
   - Dynamically updates as slider moves
   - Calculates and applies optimal scale based on viewport and image size

2. **Gap Control**
   - Range slider: 0-20%
   - Updates live as slider moves
   - Gap width calculated as percentage of average image width
   - Updates and maintains consistent display when images are cropped

3. **Color Picker**
   - Standard color selection interface
   - Updates the gap color in real-time

4. **Image Swap**
   - Exchanges left and right images
   - Updates both display and internal image references
   - Maintains crop settings when swapped

### Cropping System

1. **Crop Mode**
   - Initiated by "Crop Images" button
   - Overlays crop boxes on both images
   - Synchronizes dimensions between both crop boxes
   - Handles for resizing (corners and sides)
   - Movement controls for positioning images within crop frames

2. **Alignment Mode**
   - Toggled by checkbox or 'a' key
   - Overlays images with inverse grayscale transformations
   - Enables precise alignment of features
   - Dynamic resizing of crop boxes while maintaining aspect ratio

3. **Movement Controls**
   - Click inside a crop box to move the image beneath it
   - Click outside to move both images together
   - Tab key to cycle between selecting left, right, or both images
   - Direction locking based on initial movement:
     - Horizontal movement locks to left/right
     - Vertical movement locks to up/down
     - Diagonal movement allows both directions
   - Fine-grained control for small movements near the center

4. **Keyboard Navigation**
   - Arrow keys for 1-pixel precision movements
   - Shift+arrow keys for 5-pixel movements
   - Tab key to cycle selection

### Export System

1. **Format Options**
   - PNG format (lossless, preserves transparency)
   - JPG format (configurable quality)
   - Quality slider for JPG (0-100%)

2. **Filename Generation**
   - Automatic generation based on source filenames
   - Intelligent common prefix detection
   - Custom prefix support
   - Format-appropriate file extension (.jpg/.png)

3. **Save Process**
   - Create a new canvas at full resolution
   - Render the combined image at 100% scale (no display scaling)
   - Convert to data URL with selected format/quality
   - Trigger download through virtual link click

### Help System

1. **Documentation Interface**
   - Modal or separate window with help content
   - Tabbed interface for different topics:
     - Basics
     - Cropping
     - Advanced
     - Shortcuts

2. **Accessibility**
   - Help icon in header
   - Keyboard shortcut (`?`) to access help
   - Clear, concise explanations with visual emphasis

## Technical Requirements

### Core Technologies

- **Canvas API**: For image rendering, manipulation, and export
- **File API**: For reading and processing local image files
- **Drag and Drop API**: For intuitive image loading
- **LocalStorage API**: For persistent settings

### Image Processing Capabilities

1. **Image Transformation**
   - Convert to grayscale for alignment mode
   - Invert colors for contrast in alignment mode
   - Support for image composition and layering

2. **Canvas Operations**
   - Dynamic resizing based on content and viewport
   - Pixel-level manipulation for precise cropping
   - Proper handling of high-DPI displays

3. **Crop Box Manipulation**
   - Constraint-based resizing with synchronized dimensions
   - Boundary checking to prevent crop boxes from exceeding image dimensions
   - Minimum size enforcement (approximately 3x handle size)

### User Experience Requirements

1. **Responsive Layout**
   - Adapts to different screen sizes
   - Recalculates optimal display on window resize
   - Special handling for mobile devices (larger touch targets)

2. **Visual Feedback**
   - Highlight active/movable crop boxes
   - Cursor changes based on current action (resize, move)
   - Animated transitions for smoother UX

3. **Accessibility Considerations**
   - Keyboard navigation for all functions
   - Clear visual indicators for interactive elements
   - Adequate color contrast

## Implementation Guidelines

### Data Structure

1. **Image State**
   - Store references to both loaded images
   - Track original dimensions for proper scaling
   - Maintain cropbox coordinates relative to each image

2. **Crop Box Model**
   - Position (x, y coordinates)
   - Dimensions (width, height)
   - Y-offset for vertical alignment
   - Handle positions and interaction zones

3. **User Preferences**
   - Scale percentages (for cropped and uncropped states)
   - Gap width and color
   - Filename prefix
   - Export format and quality
   - UI state (alignment mode, horizontal-only, etc.)

### Function Categories

1. **Image Loading & Management**
   - Process file inputs
   - Create image objects
   - Handle image replacement
   - Image property extraction

2. **Rendering Functions**
   - Draw images at specified scale
   - Apply gap with color
   - Render crop interface
   - Handle different modes (alignment vs. standard)

3. **Interaction Handlers**
   - Mouse/touch event processing
   - Keyboard shortcut management
   - Drag detection and movement calculation
   - Resize operations

4. **Export Processing**
   - Canvas creation at target resolution
   - Format conversions
   - Filename generation
   - Download triggering

5. **Utility Functions**
   - Scale calculations
   - Boundary checking
   - Common prefix detection
   - Local storage management

### Performance Considerations

1. **Rendering Optimization**
   - Limit unnecessary redraws
   - Use requestAnimationFrame for smoother animations
   - Properly dispose of temporary canvases

2. **Large Image Handling**
   - Efficient scaling for display
   - Proper memory management
   - Progress indicators for large operations

3. **Touch Device Support**
   - Larger handle sizes on touch devices
   - Prevent default behaviors for touch events in crop mode
   - Special handling for pinch zoom and other gestures

## User Flow

1. **Initial State**
   - Show dropzone with instructions
   - Controls disabled until images loaded

2. **Loading Images**
   - Drag-drop or browse for two images
   - Process and display side-by-side
   - Enable controls
   - Show image filenames

3. **Basic Adjustments**
   - Adjust scale for comfortable viewing
   - Modify gap width and color
   - Optionally swap images

4. **Cropping Workflow**
   - Enter crop mode
   - Initially in alignment mode for precise positioning
   - Adjust crop boxes
   - Position images
   - Apply or cancel crop
   - Option to reset to original state

5. **Export Process**
   - Enter filename prefix (optional)
   - Select format (JPG/PNG)
   - Adjust quality (JPG only)
   - Save combined image
   - File downloads to local device

This specification provides a comprehensive blueprint for recreating the Stereo Image Combiner application, capturing all its functionality, interaction design, and technical requirements.
