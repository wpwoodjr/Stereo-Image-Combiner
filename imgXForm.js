/**
 * Transforms pixels in an image based on a specified transformation function
 * @param {ImageData} imageData - The image data to transform
 * @param {Function} transformFunction - Function that takes (r,g,b,a,x,y) and returns [r,g,b,a]
 * @return {ImageData} Transformed image data
 */
function transformImagePixels(imageData, transformFunction) {
    // Create a copy of the image data to avoid modifying the original
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );
    
    const data = newImageData.data;
    const width = newImageData.width;
    const height = newImageData.height;
    
    // Process each pixel
    for (let y = 0; y < height; y++) {
        const rowIndex = y * width;
        for (let x = 0; x < width; x++) {
            // Calculate pixel index (each pixel has 4 values: R, G, B, A)
            const i = (rowIndex + x) * 4;
            
            // Get current pixel values
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Apply transformation function with position info
            const [newR, newG, newB, newA] = transformFunction(r, g, b, a, x, y);
            
            // Set new pixel values
            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
            data[i + 3] = newA;
        }
    }
    
    return newImageData;
}

function transformImage(imgElement, transformFunction) {
    // Create a canvas element to work with the image data
    const canvas = document.createElement('canvas');
    canvas.width = imgElement.naturalWidth || imgElement.width;
    canvas.height = imgElement.naturalHeight || imgElement.height;
    
    // Get canvas context and draw the image onto it
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0);
    
    // Get the image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Transform the image data
    const transformedImageData = transformImagePixels(imageData, transformFunction);
    
    // Put the transformed data back to the canvas
    ctx.putImageData(transformedImageData, 0, 0);
    
    return canvas;
}

// // Advanced contrast using curves (S-curve for more natural contrast)
// function sCurveContrast(r, g, b, a, strength = 1.5) {
//     // Normalize to 0-1 range
//     const normalizeR = r / 255;
//     const normalizeG = g / 255;
//     const normalizeB = b / 255;
    
//     // Apply S-curve formula: value = 0.5 * (1 + sin(π * (value - 0.5) * strength))
//     // This creates a nice S-shaped curve that preserves more details in shadows and highlights
//     const newR = 0.5 * (1 + Math.sin(Math.PI * (normalizeR - 0.5) * strength));
//     const newG = 0.5 * (1 + Math.sin(Math.PI * (normalizeG - 0.5) * strength));
//     const newB = 0.5 * (1 + Math.sin(Math.PI * (normalizeB - 0.5) * strength));

//     // Convert back to 0-255 range
//     return [
//         Math.min(255, Math.max(0, Math.round(newR * 255))),
//         Math.min(255, Math.max(0, Math.round(newG * 255))),
//         Math.min(255, Math.max(0, Math.round(newB * 255))),
//         a
//     ];
// }
