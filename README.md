# Stereo Image Combiner

A simple web-based tool for combining two images side by side with customizable options.  Particularly useful for stereo slide pairs.

![image](https://github.com/user-attachments/assets/f5726ce8-f46b-4a50-a4db-27461eb6d69a)

## Overview

Image Combiner is a lightweight browser-based application that allows users to:
- Combine two images side by side into a single image
- Adjust the gap between images
- Change the color of the gap between images
- Scale the preview display
- Swap image positions
- Save the resulting combined image as a PNG or JPG file

No server processing or uploading is required - all operations happen directly in your browser.

## Features

- **Drag and Drop Interface**: Simply drag and drop your images onto the application, or use the file browser
- **Live Preview**: See how your combined image will look as you adjust settings
- **Customizable Gap**: Adjust the space between images from 0 to 200 pixels
- **Gap Color Selection**: Choose any color for the space between your images
- **Image Swapping**: Easily change the order of images with a single click
- **Scalable Preview**: Adjust the preview size without affecting the final output
- **High-Quality Export**: Save the combined image in PNG format at full resolution or JPG at your selected quality

## Usage

1. Open `index.html` in any modern web browser, or browse to https://wpwoodjr.github.io/Stereo-Image-Combiner/
2. Drag and drop two images onto the designated drop zone
3. Use the controls to adjust:
   - Scale (for preview only)
   - Gap between images
   - Gap color
4. Click "Swap Images" to change their order, for instance to switch from cross-eyed viewing to parallel viewing of a stero image
5. Click "Save Image" to download the combined image
6. Use "Reset Images" to clear current images and start over with default settings

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

No installation required! Simply download the HTML file and open it in your browser.

## License

This project is available for free use, modification, and distribution.

## Privacy

All image processing happens locally in your browser. No images are uploaded to any server.
