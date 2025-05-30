# Stereo Image Combiner

A web-based tool for combining images side by side with customizable options. Particularly useful for stereo image pairs.

![image](https://github.com/user-attachments/assets/16ed694b-2dbc-4411-b4a4-37cbbf535d05)

## Overview

Stereo Image Combiner is a lightweight browser-based application that allows users to:
- Combine two images side by side into a single stereo image (cross or parallel)
- Work with pre-existing stereo image pairs
- Crop both images simultaneously with synchronized dimensions
- Align images precisely using an interactive overlay mode
- Adjust the size and color (optionally transparent) of the border around images
- Round the image corners
- Save the resulting combined image as a PNG or JPG file

It works on mobile, touch devices, and desktop.
No server processing or uploading is required - all operations happen directly in your browser.

## Features

- **Drag and Drop Interface**: Simply drag and drop your image(s) onto the application, or use the file browser
- **Works with Pre-existing Stereo Images**: Open a stereo image and it will be automatically split
- **Smart Border Crop**: Image borders are automatically detected and a (soft) crop is applied
- **Live Preview**: See how your combined image will look as you adjust settings
- **Advanced Image Alignment**: Use the align mode to precisely overlay images with inverse grayscale highlighting for perfect stereo alignment
- **Sophisticated Cropping**: Multiple cropping modes with synchronized dimensions and fine-grained positioning controls
- **Customizable Borders**: Adjust the border around images from 0 to 20% of average image width and apply curved styling
- **Border Color Selection**: Choose any color for the space between your images, including transparent (must save as a PNG file)
- **Image Swapping**: Easily swap the images with a single click or keyboard shortcut for cross and parallel viewing
- **Scalable Preview**: Adjust the preview size without affecting the final output
- **High-Quality Export**: Save the combined image in PNG format at full resolution or JPG at your selected quality
- **Keyboard Shortcuts**: Speed up your workflow with convenient keyboard shortcuts
- **Fullscreen Mode**: View and edit your images in fullscreen for more detailed work
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Comprehensive Help**: Detailed documentation available via the help icon

## Usage

1. Browse to https://wpwoodjr.github.io/Stereo-Image-Combiner/
   - Images are not uploaded anywhere and all operations are handled locally in your browser
2. Drag and drop one or two images onto the designated drop zone, or click to browse
   - Borders around the images will be automatically detected and cropped (click "Reset Crop" to remove the crop or "Crop Images" to tweak it)
   - If a pre-existing stereo image is opened, it will be split automatically into a left and right pair
3. Use the controls to adjust:
   - Display Scale (for preview only)
   - Border and gap size between images
   - Border and gap color
   - Optional transparency for gap and borders
   - Size of curved image corners
4. Click "Swap Images" (or press `x`) to change their order, for instance to switch from cross-eyed viewing to parallel viewing of stereo images
5. Click "Crop Images" to enter crop mode:
   - By default, you'll be in align mode
   - Click inside the crop box to align the images beneath it
   - The images are shown using inverse grayscale coloring to highlight differences
   - Resize the crop box by dragging its handles
   - Click outside to move both images together
   - Press `a` to toggle between align mode and side-by-side mode
   - Check `Synchronized Movement` to always move both images together in side-by-side mode
   - Press `h` to toggle horizontal-only movement
   - Use arrow keys for precision movements (hold `Shift` for faster movements)
   - Use `Tab` to cycle between selecting the left image, right image, or both
   - Click "Apply Crop" to confirm or "Cancel" to exit crop mode
   - After applying, you may enter crop mode again to continue where you left off
   - Click "Reset Crop" to restore original images
6. Click "Save Image" to download the combined images in PNG or JPG format

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `x` | Swap left and right images |
| `f` | Toggle fullscreen mode |
| `a` | Toggle align mode (in crop mode) |
| `h` | Toggle horizontal-only movement (in crop mode) |
| `Tab` | Cycle between selecting left box, right box, and both boxes (in crop mode) |
| `Arrow Keys` | Move image(s) under the active crop box(es) by 1 pixel |
| `Shift` + `Arrow Keys` | Move image(s) under the active crop box(es) by 5 pixels |
| `Esc` | Exit fullscreen mode |
| `?` | Show help screen |

## Technical Details

- Built with vanilla JavaScript, HTML, and CSS
- No external dependencies or libraries required
- Uses HTML5 Canvas for image manipulation and rendering
- Handles various input image formats supported by your browser (JPG, PNG, GIF, etc.)
- The final output is saved as a JPG with selectable quality setting, or as a PNG with full transparency support
- Settings are saved in local storage for persistence between sessions

## Compatibility

Works on mobile and desktop, including:
- iOS / iPad
- Android
- Windows
- Mac
- Linux

Works in all modern browsers that support:
- HTML5 Canvas
- FileReader API
- Drag and Drop API

## Installation

To run it locally, download the repository and open index.html in your browser. No server or build process is required.

## License

This project is available for free use, modification, and distribution.

## Privacy

All image processing happens locally in your browser. No images are uploaded to any server.
