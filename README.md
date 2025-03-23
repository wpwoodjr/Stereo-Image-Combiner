# Stereo Image Combiner

A simple web-based tool for combining two images side by side with customizable options. Particularly useful for stereo slide pairs.

![image](https://github.com/user-attachments/assets/3c18baea-2d0b-439a-8508-388e82e7625c)

## Overview

Image Combiner is a lightweight browser-based application that allows users to:
- Combine two images side by side into a single image
- Crop both images simultaneously with synchronized dimensions
- Adjust the gap between images
- Change the color of the gap between images
- Scale the preview display
- Swap image positions
- Save the resulting combined image as a PNG or JPG file

No server processing or uploading is required - all operations happen directly in your browser.

## Features

- **Drag and Drop Interface**: Simply drag and drop your images onto the application, or use the file browser
- **Live Preview**: See how your combined image will look as you adjust settings
- **Image Cropping**: Precisely crop both images with synchronized dimensions to focus on specific areas
- **Customizable Gap**: Adjust the space between images from 0 to 20% of average image width
- **Gap Color Selection**: Choose any color for the space between your images
- **Image Swapping**: Easily change the order of images with a single click
- **Scalable Preview**: Adjust the preview size without affecting the final output
- **High-Quality Export**: Save the combined image in PNG format at full resolution or JPG at your selected quality

## Usage

1. Browse to https://wpwoodjr.github.io/Stereo-Image-Combiner/ (not to worry, your images are all handled locally in your browser)
2. Drag and drop two images onto the designated drop zone
3. Use the controls to adjust:
   - Scale (for preview only)
   - Gap between images
   - Gap color
4. Click "Swap Images" to change their order, for instance to switch from cross-eyed viewing to parallel viewing of a stereo image
5. Click "Crop Images" to enter crop mode, where you can select matching regions from both images:
   - Adjust crop box dimensions by dragging resize handles
   - Click inside a box to move the entire box
   - When you first drag inside a crop box, it becomes the primary box and dragging it will move both boxes simultaneously
   - The other crop box may be moved independently of the primary box
   - Crop dimensions are synchronized between both images
   - Click "Apply Crop" to confirm or "Cancel" to exit crop mode
   - After applying, you may enter crop mode again to continue where you left off
   - Click "Reset Crop" to restore original images
6. Click "Save Image" to download the combined image in PNG or JPG format

## Technical Details

- Built with vanilla JavaScript, HTML, and CSS
- No external dependencies or libraries required
- Uses HTML5 Canvas for image manipulation and rendering
- Handles various input image formats supported by your browser (JPG, PNG, GIF, etc.)
- The final output is saved as a JPG with selectable quality setting, or optionally a PNG with full transparency support

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- FileReader API
- Drag and Drop API

## Installation

To run it locally, download the repository and point your browser at index.html

## License

This project is available for free use, modification, and distribution.

## Privacy

All image processing happens locally in your browser. No images are uploaded to any server.
