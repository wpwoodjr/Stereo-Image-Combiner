// ===================================
// CORE StereoImageCombiner MODULE - Main application state and initialization
// ===================================
class SIC {
    static DEBUG = false;
    // state variables
    static images = [];
    static imageNames = [];

    static initialize() {
        HelpManager.initialize();
        UIManager.initialize();
        DisplayManager.initialize();
    }
}

// ===================================
// UI MANAGER - Handles UI and event listeners
// ===================================
class UIManager {
    static DEFAULT_COLOR = '#000000';
    static GAP_TO_BORDER_RATIO = 2;
    static DEFAULT_GAP_PERCENT = 5.0;
    static DEFAULT_BORDERS = true;
    static DEFAULT_TRANSPARENT = false;
    static DEFAULT_CORNER_RADIUS_PERCENT = 22;

    static domElements = null;
    static gapColor = this.DEFAULT_COLOR;
    static gapPercent = this.DEFAULT_GAP_PERCENT;
    static hasBorders = this.DEFAULT_BORDERS;
    static isTransparent = this.DEFAULT_TRANSPARENT;
    static cornerRadiusPercent = this.DEFAULT_CORNER_RADIUS_PERCENT;
    static saveOptions = {};

    static initialize() {
        this.domElements = this.initDOMElements();
        this.setupDropzoneEvents();
        this.setupControlEvents();
        this.setupCanvasEvents();
        this.setupKeyboardEvents();
        this.setupDropzoneMessage();
        this.resetToDropzone();
        this.resetControlsToDefaults();
    }

    // Resets the UI to show the dropzone and hide the canvas.
    static resetToDropzone(progressId = null) {
        if (progressId !== null) {
            // hide progress message on screen
            this.hideProgress(progressId);
        }
        SIC.images = [];
        SIC.imageNames = [];
        this.updateImageNames();
        this.domElements.dropzone.style.display = 'flex';
        this.domElements.canvasContainer.style.display = 'none';
        this.domElements.saveButton.disabled = true;
        this.domElements.swapButton.disabled = true;

        CropManager.resetCrop();
        CropManager.setCropButtonDisabledState(true);
    }

    static initDOMElements() {
        return {
            dropzone: document.getElementById('dropzone'),
            dropzoneMessage: document.getElementById('dropzoneMessage'),
            canvas: document.getElementById('canvas'),
            canvasContainer: document.getElementById('canvasContainer'),
            scaleSlider: document.getElementById('scale'),
            scaleValue: document.getElementById('scaleValue'),
            gapSlider: document.getElementById('gap'),
            gapValue: document.getElementById('gapValue'),
            colorPicker: document.getElementById('color'),
            bordersCheckbox: document.getElementById('borders'),
            transparentCheckbox: document.getElementById('transparent'),
            cornerRadiusSlider: document.getElementById('cornerRadius'),
            cornerRadiusValue: document.getElementById('cornerRadiusValue'),
            saveButton: document.getElementById('save'),
            swapButton: document.getElementById('swap'),
            leftImageName: document.getElementById('leftImageName'),
            rightImageName: document.getElementById('rightImageName'),
            fileInput: document.getElementById('fileInput')
        };
    }

    static setupDropzoneEvents() {
        const { dropzone, dropzoneMessage, fileInput } = this.domElements;
        
        dropzone.addEventListener('click', (e) => {
            if (e.target === dropzone || e.target === dropzoneMessage) {
                fileInput.click();
            }
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.backgroundColor = '#303030';
            dropzoneMessage.textContent = 'Drop images here';
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.style.backgroundColor = '#202020';
            dropzoneMessage.innerHTML = this.getDropzoneMessageText();
        });

        dropzone.addEventListener('drop', (e) => {
            dropzoneMessage.innerHTML = this.getDropzoneMessageText();
            e.preventDefault();
            dropzone.style.backgroundColor = '#202020';
            FileManager.processFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                FileManager.processFiles(e.target.files);
                fileInput.value = '';
            }
        });
    }

    static setupControlEvents() {
        const elements = this.domElements;
        
        elements.scaleSlider.addEventListener('input', () => this.updateScale());
        elements.gapSlider.addEventListener('input', () => this.updateGap());
        elements.colorPicker.addEventListener('input', () => this.updateColor());
        elements.bordersCheckbox.addEventListener('input', () => this.updateBorders());
        elements.transparentCheckbox.addEventListener('input', () => this.updateTransparent());
        elements.cornerRadiusSlider.addEventListener('input', () => this.updateCornerRadius());
        elements.swapButton.addEventListener('click', () => this.updateSwap());
        elements.saveButton.addEventListener('click', () => this.showSaveDialog());
    }

    static setupCanvasEvents() {
        const { canvasContainer, canvas, fileInput } = this.domElements;

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
            FileManager.processFiles(e.dataTransfer.files);
        });

        canvasContainer.addEventListener('click', (e) => {
            if (CropManager.isCropping) return;
            if (e.target === canvas || e.target === canvasContainer) {
                fileInput.click();
            }
        });
    }

    static setupKeyboardEvents() {
        window.addEventListener('keydown', (e) => {
            // Check if input element is focused
            if (document.activeElement.tagName === 'INPUT' || 
                document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case 'x':
                    this.updateSwap();
                    e.preventDefault();
                    break;
                case 'f':
                    DisplayManager.toggleFullscreen();
                    e.preventDefault();
                    break;
                case '?':
                case '/':
                    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                        HelpManager.openHelp();
                        e.preventDefault();
                    }
                    break;
            }
        });
    }

    static getDropzoneMessageText() {
        let text = "Drag and drop one image (for auto-split) or two images here, or click to browse";
        if (window.matchMedia('(pointer: fine)').matches) {
            text += "<br><small>(Hold Ctrl or ⌘ while clicking to select two images)</small>";
        }
        return text;
    }

    static setupDropzoneMessage() {
        this.domElements.dropzoneMessage.innerHTML = this.getDropzoneMessageText();
    }

    static resetControlsToDefaults() {
        const elements = this.domElements;

        // Reset scale
        const uncroppedScalePercent = StorageManager.getItem('uncroppedScalePercent', ImageRenderer.DEFAULT_SCALE_PERCENT);
        ImageRenderer.setScalePercent(uncroppedScalePercent, 1);

        // Reset gap and borders
        this.gapPercent = StorageManager.getItem('gapPercent', this.DEFAULT_GAP_PERCENT);
        elements.gapSlider.value = this.gapPercent * 10;
        elements.gapValue.textContent = `${this.gapPercent.toFixed(1)}%`;
        this.hasBorders = StorageManager.getItem('hasBorders', this.DEFAULT_BORDERS);
        elements.bordersCheckbox.checked = this.hasBorders;

        // Reset color and transparency
        this.gapColor = StorageManager.getItem('gapColor', UIManager.DEFAULT_COLOR);
        elements.colorPicker.value = this.gapColor;
        this.isTransparent = StorageManager.getItem('isTransparent', this.DEFAULT_TRANSPARENT);
        elements.transparentCheckbox.checked = this.isTransparent;
        this.updateColorPickerState();

        // Reset corner radius
        this.cornerRadiusPercent = StorageManager.getItem('cornerRadiusPercent', this.DEFAULT_CORNER_RADIUS_PERCENT);
        elements.cornerRadiusSlider.value = this.cornerRadiusPercent;
        elements.cornerRadiusValue.textContent = `${this.cornerRadiusPercent}%`;

        // Reset saveOptions
        this.saveOptions = {
            outputScalePercent: StorageManager.getItem('outputScalePercent', FileManager.DEFAULT_OUTPUT_SCALE_PERCENT),
            filenamePrefix: StorageManager.getItem('filenamePrefix', FileManager.DEFAULT_FILENAME_PREFIX),
            fileFormat: StorageManager.getItem('fileFormat', FileManager.DEFAULT_FORMAT),
            jpgQuality: StorageManager.getItem('jpgQuality', FileManager.DEFAULT_JPG_QUALITY)
        };
    }

    static async showSaveDialog() {
        return new Promise((resolve) => {
            const isMobile = DisplayManager.isMobile();
            const isPortrait = DisplayManager.isPortrait();
            const useMobilePortraitLayout = isMobile && isPortrait;
            
            // Get save options
            const { outputScalePercent, fileFormat, jpgQuality, filenamePrefix } = this.saveOptions;

            // Create modal dialog
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, ${useMobilePortraitLayout ? '0.9' : '0.8'});
                backdrop-filter: blur(8px);
                z-index: 10001;
                display: flex;
                align-items: ${useMobilePortraitLayout ? 'flex-end' : 'center'};
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                animation: fadeIn 0.3s ease-out;
                padding: ${useMobilePortraitLayout ? '0' : '20px'};
                box-sizing: border-box;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = useMobilePortraitLayout ? `
                background: #1e1e1e;
                border: 1px solid #333333;
                border-radius: 24px 24px 0 0;
                padding: 20px 20px;
                max-width: 320px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6);
                animation: slideUpMobile 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                padding-bottom: calc(24px + env(safe-area-inset-bottom));
            ` : `
                background: #1e1e1e;
                border: 1px solid #333333;
                border-radius: 16px;
                padding: 32px;
                max-width: 320px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4);
                animation: slideUp 0.3s ease-out;
            `;

            // Title
            const title = document.createElement('h2');
            title.textContent = 'Save Image Options';
            title.style.cssText = `
                margin: 0 0 24px 0;
                font-size: ${useMobilePortraitLayout ? '28px' : '24px'};
                font-weight: 700;
                color: #ffffff;
                letter-spacing: -0.02em;
                text-align: ${useMobilePortraitLayout ? 'center' : 'left'};
            `;

            // Content container
            const content = document.createElement('div');
            content.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 24px;
                margin-bottom: 32px;
            `;

            // Scale section
            const scaleSection = document.createElement('div');
            const scaleLabel = document.createElement('label');
            scaleLabel.textContent = 'Scale:';
            scaleLabel.style.cssText = `
                color: #cccccc;
                margin-bottom: 8px;
                display: block;
                font-weight: 600;
            `;

            const scaleContainer = document.createElement('div');
            scaleContainer.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
            `;

            const scaleSlider = document.createElement('input');
            scaleSlider.type = 'range';
            scaleSlider.min = '10';
            scaleSlider.max = '100';
            scaleSlider.value = (outputScalePercent * 100).toString();
            scaleSlider.style.cssText = `
                flex: 1;
                background-color: #333333;
                height: ${useMobilePortraitLayout ? '30px' : '20px'};
            `;

            const scaleValue = document.createElement('span');
            scaleValue.style.cssText = `
                color: #bbbbbb;
                width: 60px;
                text-align: right;
                font-weight: 600;
            `;

            const resolutionInfo = document.createElement('div');
            resolutionInfo.style.cssText = `
                color: #888888;
                font-size: 14px;
                margin-top: 8px;
            `;

            // Update resolution display function
            const updateResolution = () => {
                const scale = parseInt(scaleSlider.value) / 100;
                scaleValue.textContent = `${parseInt(scaleSlider.value)}%`;
                
                const { totalWidth, totalHeight } = ImageRenderer.renderCombinedImage(null, scale, false, false);
                resolutionInfo.textContent = `Output resolution: ${totalWidth} × ${totalHeight}`;
            };

            scaleSlider.addEventListener('input', updateResolution);
            updateResolution(); // Initialize

            scaleContainer.appendChild(scaleSlider);
            scaleContainer.appendChild(scaleValue);
            scaleSection.appendChild(scaleLabel);
            scaleSection.appendChild(scaleContainer);
            scaleSection.appendChild(resolutionInfo);

            // Filename section
            const filenameSection = document.createElement('div');
            const filenameLabel = document.createElement('label');
            filenameLabel.textContent = 'Filename Prefix:';
            filenameLabel.style.cssText = `
                color: #cccccc;
                margin-bottom: 8px;
                display: block;
                font-weight: 600;
            `;

            const filenameInput = document.createElement('input');
            filenameInput.type = 'text';
            filenameInput.value = filenamePrefix;
            filenameInput.placeholder = 'e.g. Crossview';
            filenameInput.style.cssText = `
                width: 100%;
                background-color: #333333;
                color: #ffffff;
                border: 1px solid #555555;
                padding: ${useMobilePortraitLayout ? '12px' : '8px'};
                border-radius: 4px;
                font-size: ${useMobilePortraitLayout ? '16px' : '14px'};
                box-sizing: border-box;
            `;

            filenameSection.appendChild(filenameLabel);
            filenameSection.appendChild(filenameInput);

            // Format section
            const formatSection = document.createElement('div');
            const formatLabel = document.createElement('label');
            formatLabel.textContent = 'File Format:';
            formatLabel.style.cssText = `
                color: #cccccc;
                margin-bottom: 8px;
                display: block;
                font-weight: 600;
            `;

            const formatSelect = document.createElement('select');
            formatSelect.innerHTML = `
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
            `;
            formatSelect.value = fileFormat;
            formatSelect.style.cssText = `
                width: 100%;
                background-color: #333333;
                color: #ffffff;
                border: 1px solid #555555;
                padding: ${useMobilePortraitLayout ? '12px' : '8px'};
                border-radius: 4px;
                font-size: ${useMobilePortraitLayout ? '16px' : '14px'};
                box-sizing: border-box;
            `;

            formatSection.appendChild(formatLabel);
            formatSection.appendChild(formatSelect);

            // Quality section (for JPEG)
            const qualitySection = document.createElement('div');
            qualitySection.style.display = fileFormat === 'image/jpeg' ? 'block' : 'none';

            const qualityLabel = document.createElement('label');
            qualityLabel.textContent = 'Quality:';
            qualityLabel.style.cssText = `
                color: #cccccc;
                margin-bottom: 8px;
                display: block;
                font-weight: 600;
            `;

            const qualityContainer = document.createElement('div');
            qualityContainer.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
            `;

            const qualitySlider = document.createElement('input');
            qualitySlider.type = 'range';
            qualitySlider.min = '0';
            qualitySlider.max = '100';
            qualitySlider.value = jpgQuality.toString();
            qualitySlider.style.cssText = `
                flex: 1;
                background-color: #333333;
                height: ${useMobilePortraitLayout ? '30px' : '20px'};
            `;

            const qualityValue = document.createElement('span');
            qualityValue.textContent = `${jpgQuality}%`;
            qualityValue.style.cssText = `
                color: #bbbbbb;
                width: 60px;
                text-align: right;
                font-weight: 600;
            `;

            qualitySlider.addEventListener('input', function() {
                qualityValue.textContent = `${this.value}%`;
            });

            qualityContainer.appendChild(qualitySlider);
            qualityContainer.appendChild(qualityValue);
            qualitySection.appendChild(qualityLabel);
            qualitySection.appendChild(qualityContainer);

            // Format change handler
            formatSelect.addEventListener('change', function() {
                qualitySection.style.display = this.value === 'image/jpeg' ? 'block' : 'none';
            });

            // Buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: ${useMobilePortraitLayout ? '12px' : '16px'};
                justify-content: ${useMobilePortraitLayout ? 'stretch' : 'flex-end'};
                flex-direction: row;
            `;

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.cssText = `
                padding: ${useMobilePortraitLayout ? '16px 20px' : '12px 24px'};
                border: 2px solid #525252;
                background: #2a2a2a;
                color: #d4d4d8;
                border-radius: ${useMobilePortraitLayout ? '12px' : '10px'};
                cursor: pointer;
                font-size: ${useMobilePortraitLayout ? '17px' : '15px'};
                font-weight: 600;
                transition: all 0.2s ease;
                min-width: ${useMobilePortraitLayout ? 'auto' : '100px'};
                flex: ${useMobilePortraitLayout ? '1' : 'none'};
                min-height: ${useMobilePortraitLayout ? '52px' : 'auto'};
            `;

            const saveButton = document.createElement('button');
            saveButton.textContent = 'Save Image';
            saveButton.style.cssText = `
                padding: ${useMobilePortraitLayout ? '16px 20px' : '12px 24px'};
                border: 2px solid #6b7280;
                background: #4b5563;
                color: white;
                border-radius: ${useMobilePortraitLayout ? '12px' : '10px'};
                cursor: pointer;
                font-size: ${useMobilePortraitLayout ? '17px' : '15px'};
                font-weight: 600;
                transition: all 0.2s ease;
                min-width: ${useMobilePortraitLayout ? 'auto' : '120px'};
                flex: ${useMobilePortraitLayout ? '2' : 'none'};
                min-height: ${useMobilePortraitLayout ? '52px' : 'auto'};
            `;

            // Add CSS animations if not already present
            if (!document.getElementById('modal-animations')) {
                const style = document.createElement('style');
                style.id = 'modal-animations';
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { 
                            opacity: 0;
                            transform: translateY(20px) scale(0.95);
                        }
                        to { 
                            opacity: 1;
                            transform: translateY(0) scale(1);
                        }
                    }
                    @keyframes slideUpMobile {
                        from { 
                            transform: translateY(100%);
                        }
                        to { 
                            transform: translateY(0);
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            // Button hover effects
            cancelButton.addEventListener('mouseenter', () => {
                cancelButton.style.borderColor = '#737373';
                cancelButton.style.color = '#ffffff';
                cancelButton.style.backgroundColor = '#404040';
            });

            cancelButton.addEventListener('mouseleave', () => {
                cancelButton.style.borderColor = '#525252';
                cancelButton.style.color = '#d4d4d8';
                cancelButton.style.backgroundColor = '#2a2a2a';
            });

            saveButton.addEventListener('mouseenter', () => {
                saveButton.style.backgroundColor = '#6b7280';
                saveButton.style.borderColor = '#9ca3af';
                saveButton.style.transform = 'translateY(-1px)';
            });

            saveButton.addEventListener('mouseleave', () => {
                saveButton.style.backgroundColor = '#4b5563';
                saveButton.style.borderColor = '#6b7280';
                saveButton.style.transform = 'translateY(0)';
            });

            // Event handlers
            let isModalClosed = false;
            
            const closeModal = (shouldSave) => {
                if (isModalClosed) return;
                isModalClosed = true;
                
                document.removeEventListener('keydown', escHandler);
                
                if (modal.parentNode) {
                    document.body.removeChild(modal);
                }
                
                if (shouldSave) {
                    // Get current values from the modal
                    this.saveOptions = {
                        outputScalePercent: parseInt(scaleSlider.value) / 100,
                        filenamePrefix: filenameInput.value,
                        fileFormat: formatSelect.value,
                        jpgQuality: parseInt(qualitySlider.value)
                    };
                    
                    // Try to save settings to localStorage for next time
                    StorageManager.setItem('outputScalePercent', this.saveOptions.outputScalePercent);
                    StorageManager.setItem('filenamePrefix', this.saveOptions.filenamePrefix);
                    StorageManager.setItem('fileFormat', this.saveOptions.fileFormat);
                    StorageManager.setItem('jpgQuality', this.saveOptions.jpgQuality);
                    
                    // Proceed with actual save, passing the current values
                    FileManager.saveImage(this.saveOptions);
                }
                
                resolve(shouldSave);
            };

            cancelButton.addEventListener('click', () => closeModal(false));
            saveButton.addEventListener('click', () => closeModal(true));

            // ESC key handler
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal(false);
                }
            };
            document.addEventListener('keydown', escHandler);

            // Assemble dialog
            content.appendChild(scaleSection);
            content.appendChild(filenameSection);
            content.appendChild(formatSection);
            content.appendChild(qualitySection);

            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(saveButton);

            dialog.appendChild(title);
            dialog.appendChild(content);
            dialog.appendChild(buttonContainer);

            modal.appendChild(dialog);
            document.body.appendChild(modal);

            // Focus the filename input
            filenameInput.focus();
        });
    }

    static updateScale() {
        const newScalePercent = parseInt(this.domElements.scaleSlider.value) / 100;

        if (CropManager.isCropping) {
            CropManager.onScaleChange(newScalePercent);
        } else {
            ImageRenderer.setScalePercent(newScalePercent);
            if (CropManager.isCropped) {
                StorageManager.setItem('croppedScalePercent', newScalePercent);
            } else {
                StorageManager.setItem('uncroppedScalePercent', newScalePercent);
            }
            ImageRenderer.drawImages();
        }
    }

    static updateGap() {
        const sliderValue = parseInt(this.domElements.gapSlider.value);
        this.gapPercent = sliderValue / 10;
        StorageManager.setItem('gapPercent', this.gapPercent);
        this.domElements.gapValue.textContent = `${this.gapPercent.toFixed(1)}%`;

        if (SIC.images.length !== 2) return;

        if (CropManager.isCropping) {
            CropManager.onScaleChange(0);
        } else {
            const optimalScale = ImageRenderer.calculateMaxScale(SIC.images[0], SIC.images[1]);
            ImageRenderer.setScalePercent(ImageRenderer.currentScalePercent(), optimalScale);
            ImageRenderer.drawImages();
        }
    }

    static updateColor() {
        this.gapColor = this.domElements.colorPicker.value;
        StorageManager.setItem('gapColor', this.gapColor);
        if (CropManager.isCropping) {
            CropRenderer.drawCropInterface();
        } else {
            ImageRenderer.drawImages();
        }
    }

    static updateBorders() {
        this.hasBorders = this.domElements.bordersCheckbox.checked;
        StorageManager.setItem('hasBorders', this.hasBorders);

        if (SIC.images.length !== 2) return;

        if (CropManager.isCropping) {
            CropManager.onScaleChange(0);
        } else {
            const optimalScale = ImageRenderer.calculateMaxScale(SIC.images[0], SIC.images[1]);
            ImageRenderer.setScalePercent(ImageRenderer.currentScalePercent(), optimalScale);
            ImageRenderer.drawImages();
        }
    }

    static updateTransparent() {
        this.isTransparent = this.domElements.transparentCheckbox.checked;
        StorageManager.setItem('isTransparent', this.isTransparent);
        this.updateColorPickerState();
        if (CropManager.isCropping) {
            CropRenderer.drawCropInterface();
        } else {
            ImageRenderer.drawImages();
        }
    }

    static updateColorPickerState() {
        const colorPicker = this.domElements.colorPicker;
        const canvas = this.domElements.canvas;
        
        colorPicker.disabled = this.isTransparent;
        if (this.isTransparent) {
            colorPicker.style.opacity = '0.5';
            colorPicker.style.pointerEvents = 'none';
            colorPicker.style.filter = 'grayscale(1)';
            canvas.classList.add('transparent-bg');
        } else {
            colorPicker.style.opacity = '1';
            colorPicker.style.pointerEvents = 'auto';
            colorPicker.style.filter = 'none';
            canvas.classList.remove('transparent-bg');
        }
    }

    static updateCornerRadius() {
        this.cornerRadiusPercent = parseInt(this.domElements.cornerRadiusSlider.value);
        StorageManager.setItem('cornerRadiusPercent', this.cornerRadiusPercent);
        this.domElements.cornerRadiusValue.textContent = `${this.cornerRadiusPercent}%`;
        if (CropManager.isCropping) {
            CropRenderer.drawCropInterface();
        } else {
            ImageRenderer.drawImages();
        }
    }

    static updateSwap() {
        [SIC.images[0], SIC.images[1]] = [SIC.images[1], SIC.images[0]];
        [SIC.imageNames[0], SIC.imageNames[1]] = [SIC.imageNames[1], SIC.imageNames[0]];
        this.updateImageNames();
        CropManager.onSwap();
    }

    static updateImageNames() {
        this.domElements.leftImageName.textContent = SIC.imageNames[0] || '';
        this.domElements.rightImageName.textContent = SIC.imageNames[1] || '';
    }

    static setSaveButtonDisabledState(state) {
        this.domElements.saveButton.disabled = state;
    }

    static progressElements = new Map();
    static progressIdCounter = 0;

    static showProgress(message) {
        const id = ++this.progressIdCounter;
        
        const progressElement = document.createElement('div');
        progressElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 8px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            min-width: 250px;
            text-align: center;
        `;
        
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.style.marginBottom = '10px';
        
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 20px;
            height: 20px;
            border: 2px solid #666;
            border-top: 2px solid #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        `;
        
        // Add CSS animation
        if (!document.getElementById('progress-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'progress-spinner-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        progressElement.appendChild(messageElement);
        progressElement.appendChild(spinner);
        document.body.appendChild(progressElement);
        
        this.progressElements.set(id, {
            element: progressElement,
            messageElement: messageElement
        });
        
        return id;
    }

    static updateProgress(id, message) {
        const progress = this.progressElements.get(id);
        if (progress) {
            progress.messageElement.textContent = message;
        }
    }

    static hideProgress(id) {
        const progress = this.progressElements.get(id);
        if (progress) {
            document.body.removeChild(progress.element);
            this.progressElements.delete(id);
        }
    }

    // Clean up all progress indicators (useful for error handling)
    static hideAllProgress() {
        for (const [id, progress] of this.progressElements) {
            try {
                document.body.removeChild(progress.element);
            } catch (error) {
                // Element might already be removed
            }
        }
        this.progressElements.clear();
    }
}

// ===================================
// FILE MANAGER - Handles file operations
// ===================================
class FileManager {
    static DEFAULT_FORMAT = 'image/jpeg';
    static DEFAULT_JPG_QUALITY = 95;
    static DEFAULT_OUTPUT_SCALE_PERCENT = 1.0;
    static DEFAULT_FILENAME_PREFIX = '';

    static async _renderRegions(sourceImage, regions, imageNames, progressId) {
        const { region1, region2 } = regions;
        // width without gap
        const r1Width = region1.x + region1.width;
        const r2Width = sourceImage.width - region2.x;

        const img1Height = regions.img1Height;
        const img2Height = regions.img2Height;
        const splitPoint = regions.splitPoint;

        const renderR1 = { x: 0, y: 0, width: r1Width, height: img1Height };
        const renderR2 = { x: region2.x, y: 0, width: r2Width, height: img2Height };
        if (BorderFinder.SOFT_GAP_CROP) {
            renderR1.width = splitPoint;
            renderR2.x = splitPoint;
            renderR2.width = sourceImage.width - splitPoint;
        }

        try {
            const [img1_obj, img2_obj] = await Promise.all([
                this._renderToImageObject(sourceImage, renderR1),
                this._renderToImageObject(sourceImage, renderR2)
            ]);
            this._finalizeImageLoading([ img1_obj, img2_obj ], imageNames);
            this._applyCrop(regions);
        } catch (cropError) {
            console.error("Error rendering sub-images from single image after analysis:", cropError);
            await this._executeFallbackSplit(sourceImage, imageNames, "Error rendering analyzed sub-images.", progressId);
        }
    }

    static _renderToImageObject(sourceImage, region) {
        return new Promise((resolve, reject) => {
            if (!region || region.width <= 0 || region.height <= 0) {
                return reject(new Error(`Invalid crop region: ${JSON.stringify(region)}`));
            }
            const canvas = document.createElement('canvas');
            canvas.width = region.width;
            canvas.height = region.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error("Failed to get 2D context for cropping canvas."));
            
            try {
                ctx.drawImage(
                    sourceImage,
                    region.x, region.y, region.width, region.height,
                    0, 0, region.width, region.height
                );
                const newImg = new Image();
                newImg.onload = () => resolve(newImg);
                newImg.onerror = (errEvent) => {
                    console.error("Error loading cropped image from dataURL:", errEvent);
                    reject(new Error("Cropped image could not be loaded from dataURL."));
                };
                newImg.src = canvas.toDataURL();
            } catch (e) {
                console.error("Error drawing image to crop canvas or creating dataURL:", e);
                reject(e);
            }
        });
    }

    static _finalizeImageLoading(loadedImages, loadedNames) {
        SIC.images = [];
        CropManager.resetCrop();
        SIC.images = loadedImages;
        SIC.imageNames = loadedNames;

        UIManager.domElements.canvasContainer.style.display = 'block';
        UIManager.domElements.dropzone.style.display = 'none';
        UIManager.updateImageNames();

        if (SIC.images.length === 2 && SIC.images[0] && SIC.images[1]) {
            const optimalScale = ImageRenderer.calculateMaxScale(SIC.images[0], SIC.images[1]);
            ImageRenderer.setScalePercent(ImageRenderer.currentScalePercent(), optimalScale);

            UIManager.domElements.saveButton.disabled = false;
            UIManager.domElements.swapButton.disabled = false;
            CropManager.setCropButtonDisabledState(false);
        } else {
            console.error("Finalizing image loading with invalid image count or objects.", loadedImages);
            alert("There was an issue preparing the images for display.");
            UIManager.resetToDropzone(); // Use helper to reset UI
        }
    }

    /**
     * Loads an image from a File object.
     * @param {File} file - The file to load.
     * @returns {Promise<{image: HTMLImageElement, name: string}>} A promise that resolves with the loaded image and its name.
     * @private
     */
    static _loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    resolve({ image: img, name: file.name });
                };
                img.onerror = () => {
                    const errorMsg = `Could not load image: ${file.name}`;
                    alert(errorMsg);
                    reject(new Error(errorMsg));
                };
                img.src = event.target.result;
            };
            reader.onerror = () => {
                const errorMsg = `Could not read file: ${file.name}`;
                alert(errorMsg);
                reject(new Error(errorMsg));
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * Extracts the base name and extension from a filename.
     * @param {string} fileName - The full filename.
     * @returns {{baseName: string, ext: string}} An object containing the base name and extension.
     * @private
     */
    static _generateImageNameParts(fileName) {
        const baseName = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
        const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
        return { baseName, ext };
    }

    /**
     * Executes a fallback mechanism to split an image in half if primary processing fails.
     * @param {HTMLImageElement} originalImage - The image to split.
     * @param {array} imageNames - Array of two image names.
     * @param {string} contextMessage - A message for console logging about why fallback is triggered.
     * @private
     */
    static async _executeFallbackSplit(originalImage, imageNames, contextMessage, progressId) {
        console.warn(`Executing fallback split due to: ${contextMessage}`);
        const fallbackRegions = BorderFinder.splitAreaInHalfVertically(0, 0, originalImage.width, originalImage.height);
        if (fallbackRegions) {
            try {
                const [fb_img1, fb_img2] = await Promise.all([
                    this._renderToImageObject(originalImage, fallbackRegions.region1),
                    this._renderToImageObject(originalImage, fallbackRegions.region2)
                ]);
                this._finalizeImageLoading([ fb_img1, fb_img2 ], imageNames);
                ImageRenderer.drawImages();
            } catch (fbError) {
                console.error(`Error during fallback image splitting (${contextMessage}):`, fbError);
                alert(`Fallback image splitting failed: ${fbError.message}. Please provide two separate images.`);
                UIManager.resetToDropzone(progressId);
            }
        } else {
            alert("Image too small for any processing, even fallback splitting. Please provide a larger or two separate images.");
            UIManager.resetToDropzone(progressId);
        }
    }

    /**
     * Processes dropped or selected image files.
     * Can handle a single image (attempts to auto-split) or two separate images.
     * @param {FileList} files - The list of files to process.
     */
    static async processFiles(files) {
        let progressId = null;
        if (files.length === 1) {
            const file = files[0];
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file.');
                return;
            }

            // Show initial progress
            progressId = UIManager.showProgress('Loading image...');

            let singleImg, originalName;
            try {
                const loadedFile = await this._loadImageFromFile(file);
                singleImg = loadedFile.image;
                originalName = loadedFile.name;
            } catch (error) {
                console.error("Error loading single image:", error.message || error);
                alert('Error loading single image.');
                UIManager.resetToDropzone(progressId);
                return;
            }

            const { baseName, ext } = this._generateImageNameParts(originalName);
            const imageNames = [`${baseName}_L${ext}`, `${baseName}_R${ext}`];

            UIManager.updateProgress(progressId, 'Finding image borders...');
            // Allow UI to update before intensive processing
            await new Promise(resolve => setTimeout(resolve, 500));
            const regions = BorderFinder.analyzeAndExtractSubImageRegions_MultiStage(
                singleImg,
                singleImg.naturalHeight,
                singleImg.naturalHeight
            );

            UIManager.updateProgress(progressId, 'Rendering images...');
            // yield control to show progress message because if there's an error control may never be yielded
            await new Promise(resolve => setTimeout(resolve, 150));
            if (regions && regions.region1 && regions.region2) {
                await this._renderRegions(singleImg, regions, imageNames, progressId);
            } else {
                await this._executeFallbackSplit(singleImg, imageNames, "Analysis yielded invalid/null regions.", progressId);
            }
            // Auto-hide after a reasonable delay
            setTimeout(() => {
                UIManager.hideProgress(progressId);
            }, 150);

        } else if (files.length === 2) {
            try {
                for (const file of files) {
                    if (!file.type.startsWith('image/')) {
                        alert('Please select only image files.');
                        return;
                    }
                }

                // Show initial progress
                progressId = UIManager.showProgress('Loading images...');

                const imageLoadPromises = Array.from(files).map(file => this._loadImageFromFile(file));
                const loadedImageResults = await Promise.all(imageLoadPromises);

                const originalImages = loadedImageResults.map(result => result.image);
                const imageNames = loadedImageResults.map(result => result.name);
                
                const img1 = originalImages[0];
                const img2 = originalImages[1];

                if (!img1 || !img2 || !img1.naturalWidth || !img1.naturalHeight || !img2.naturalWidth || !img2.naturalHeight) {
                    console.error("One or both images have invalid dimensions after loading.", img1, img2);
                    alert("Could not process images due to invalid dimensions.");
                    UIManager.resetToDropzone(progressId);
                    return;
                }
                
                const combinedCanvas = document.createElement('canvas');
                const combinedCtx = combinedCanvas.getContext('2d');
                if (!combinedCtx) {
                    alert("Failed to create canvas context for combining images.");
                    UIManager.resetToDropzone(progressId);
                    return;
                }

                combinedCanvas.width = img1.naturalWidth + img2.naturalWidth;
                combinedCanvas.height = Math.max(img1.naturalHeight, img2.naturalHeight);

                combinedCtx.drawImage(img1, 0, 0);
                combinedCtx.drawImage(img2, img1.naturalWidth, 0);

                const combinedImageElement = new Image();
                const combinedImagePromise = new Promise((resolve, reject) => {
                    combinedImageElement.onload = () => resolve(combinedImageElement);
                    combinedImageElement.onerror = (err) => {
                        console.error("Error loading combined image from dataURL:", err);
                        reject(new Error("Could not load combined image for analysis."));
                    };
                });
                combinedImageElement.src = combinedCanvas.toDataURL();

                let combinedImg;
                try {
                    combinedImg = await combinedImagePromise;
                } catch (error) {
                    alert(error.message);
                    UIManager.resetToDropzone(progressId);
                    return;
                }

                UIManager.updateProgress(progressId, 'Finding image borders...');
                // Allow UI to update before intensive processing
                await new Promise(resolve => setTimeout(resolve, 500));
                const actualSplitPoint = img1.naturalWidth;
                const regions = BorderFinder.analyzeAndExtractSubImageRegions_MultiStage(
                    combinedImg,
                    img1.naturalHeight,
                    img2.naturalHeight,
                    actualSplitPoint
                );

                UIManager.updateProgress(progressId, 'Rendering images...');
                // yield control to show progress message because if there's an error control may never be yielded
                await new Promise(resolve => setTimeout(resolve, 150));
                this._finalizeImageLoading(originalImages, imageNames);
                if (regions && regions.region1 && regions.region2) {
                    this._applyCrop(regions);
                } else {
                    console.warn("Analysis of the combined images failed to find distinct regions.");
                    console.log(`Loading original images:
    Img1(x:${0}, y:${0}, w:${img1.naturalWidth}, h:${img1.naturalHeight}),
    Img2(x:${img1.naturalWidth}, y:${0}, w:${img2.naturalWidth}, h:${img2.naturalHeight})`);
                    ImageRenderer.drawImages();
                }
                setTimeout(() => {
                    UIManager.hideProgress(progressId);
                }, 150);

            } catch (error) {
                console.error("Error processing two images:", error.message || error);
                alert('Error processing two images.');
                UIManager.resetToDropzone(progressId);
            }
        } else {
            alert('Please select one or two images.');
        }
    }

    static _applyCrop(regions) {
        if (regions.cropBoundaries) {
            CropManager.setCropState(regions.cropBoundaries);
        } else {
            ImageRenderer.drawImages();
        }
    }

    static async saveImage(saveOptions) {
        let progressId = null;
         try {
            // Validate images first
            if (!SIC.images || SIC.images.length !== 2 || !SIC.images[0] || !SIC.images[1]) {
                throw new Error("Images are not properly loaded");
            }

            // Get save options
            const { outputScalePercent, fileFormat, jpgQuality, filenamePrefix } = saveOptions;
            
            if (UIManager.isTransparent && fileFormat === 'image/jpeg') {
                alert('JPG format does not support transparency. Please choose PNG format to preserve transparency, or uncheck the Transparent option.');
                return;
            }

            progressId = UIManager.showProgress('Rendering image...');
            // yield control to show progress message
            await new Promise(resolve => setTimeout(resolve, 150));

            // Create canvas and render
            const canvas = document.createElement('canvas');
            ImageRenderer.renderCombinedImage(canvas, outputScalePercent, true, true);

            // Convert to blob
            UIManager.updateProgress(progressId, 'Preparing image for download...');
            const blob = await this.canvasToBlob(canvas, fileFormat, jpgQuality);

            // Download with smart cleanup
            UIManager.updateProgress(progressId, 'Starting download...');
            await new Promise(resolve => setTimeout(resolve, 150));
            this.downloadWithCleanup(blob, fileFormat, filenamePrefix);

            UIManager.updateProgress(progressId, 'Download initiated successfully!');
            
            // Auto-hide after a reasonable delay
            setTimeout(() => {
                UIManager.hideProgress(progressId);
            }, 2000);

        } catch (error) {
            UIManager.hideProgress(progressId);
            console.error('Save operation failed:', error);
            alert(`Failed to save image: ${error.message}`);
        }
    }

    static async canvasToBlob(canvas, fileFormat, jpgQuality) {
        return new Promise((resolve, reject) => {
            const callback = (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Failed to convert canvas to blob"));
                }
            };

            try {
                if (fileFormat === 'image/jpeg') {
                    canvas.toBlob(callback, fileFormat, jpgQuality / 100);
                } else {
                    canvas.toBlob(callback, fileFormat);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    static downloadWithCleanup(blob, fileFormat, filenamePrefix) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.style.display = 'none';

        const fileName = this.createCombinedFilename(filenamePrefix);
        const extension = fileFormat === 'image/jpeg' ? 'jpg' : 'png';
        link.download = link.download = `${fileName}.${extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up URL after a short delay (browser needs time to start download)
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    }

    /**
     * Finds the common prefix of two strings, trying to end at a natural separator.
     * It also cleans trailing separators from the result.
     */
    static findCommonPrefixLastSeparator(str1, str2) {
        if (!str1 || !str2 ) return '';
        
        let commonLength = 0;
        for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
            // Case-insensitive comparison for the common part
            if (str1.charAt(i).toLowerCase() !== str2.charAt(i).toLowerCase()) break;
            commonLength = i + 1;
        }
        if (commonLength === 0) return '';

        let commonPart = str1.substring(0, commonLength);
        
        // If one string is an exact prefix of the other (or they are identical up to commonLength)
        // return the cleaned commonPart.
        if (commonPart.length === str1.length || commonPart.length === str2.length) {
            return commonPart.replace(/[-_\s]+$/, ''); 
        }

        const separators = ['_', '-', ' '];
        let lastSepPos = -1;
        // Find the last separator *within this commonPart*
        for (const sep of separators) {
            const pos = commonPart.lastIndexOf(sep);
            if (pos > lastSepPos) { 
                lastSepPos = pos;
            }
        }
        
        if (lastSepPos !== -1) {
            // Return part up to AND INCLUDING the separator, then clean trailing separators from this result
            return commonPart.substring(0, lastSepPos + 1).replace(/[-_\s]+$/, '');
        } 
        // No separator in common part, but common part exists. 
        // Return if it's a meaningful length, cleaned.
        return commonPart.length > 2 ? commonPart.replace(/[-_\s]+$/, '') : ''; 
    }

    /**
     * Removes a given prefix from the start of a name, if present.
     * Also removes an immediately following separator (space, _, -) and trims leading spaces from the result.
     * Comparison is case-insensitive.
     * @param {string} name The name to strip.
     * @param {string} filenamePrefix The prefix to remove.
     * @returns {string} The name with the prefix stripped, or the original name.
     */
    static _stripFilenamePrefix(name, filenamePrefix) {
        if (!filenamePrefix || !name) {
            return name;
        }
        const prefixLower = filenamePrefix.toLowerCase();
        const nameLower = name.toLowerCase();

        if (nameLower.startsWith(prefixLower)) {
            let strippedName = name.substring(filenamePrefix.length);
            // If the character immediately after the prefix was a common separator, remove it too.
            if (strippedName.length > 0 && [' ', '_', '-'].includes(strippedName.charAt(0))) {
                strippedName = strippedName.substring(1);
            }
            return strippedName.trimStart(); // Remove any further leading spaces
        }
        return name;
    }

    /**
     * Creates a combined filename.
     */
    static createCombinedFilename(userInputPrefix) {
        const filenamePrefix = userInputPrefix.trim();
        const imageNames = SIC.imageNames;
        const DEFAULT_CORE_NAME = "stereo_image";
        const MIN_CORE_LENGTH = 3; 

        if (!imageNames || imageNames.length < 2 || !imageNames[0] || !imageNames[1]) {
            return filenamePrefix ? `${filenamePrefix} ${DEFAULT_CORE_NAME}`.trim() : DEFAULT_CORE_NAME;
        }

        let baseName1_noExt = imageNames[0].includes('.') ? 
            imageNames[0].substring(0, imageNames[0].lastIndexOf('.')) : 
            imageNames[0];
        let baseName2_noExt = imageNames[1].includes('.') ?
            imageNames[1].substring(0, imageNames[1].lastIndexOf('.')) :
            imageNames[1];

        const normalizedBaseName1 = this._stripFilenamePrefix(baseName1_noExt, filenamePrefix);
        const normalizedBaseName2 = this._stripFilenamePrefix(baseName2_noExt, filenamePrefix);
        
        let finalNameCore;

        if ((!normalizedBaseName1 || normalizedBaseName1.length < 1) && 
            (!normalizedBaseName2 || normalizedBaseName2.length < 1)) {
            finalNameCore = DEFAULT_CORE_NAME;
        } else if (!normalizedBaseName1 || normalizedBaseName1.length < 1) {
            finalNameCore = normalizedBaseName2;
        } else if (!normalizedBaseName2 || normalizedBaseName2.length < 1) {
            finalNameCore = normalizedBaseName1;
        } else {
            finalNameCore = this.findCommonPrefixLastSeparator(normalizedBaseName1, normalizedBaseName2);
        }
        
        if (!finalNameCore || finalNameCore.trim().length < MIN_CORE_LENGTH) {
            console.warn(`Derived common core name "${finalNameCore}" is too short or empty. Using default.`);
            finalNameCore = DEFAULT_CORE_NAME;
        } else {
            finalNameCore = finalNameCore.trim();
        }

        if (filenamePrefix) {
            const coreLower = finalNameCore.toLowerCase();
            const prefixLower = filenamePrefix.toLowerCase();
            if (coreLower.startsWith(prefixLower) && 
                (coreLower.length === prefixLower.length || [' ', '_', '-'].includes(coreLower.charAt(prefixLower.length)))) {
                return finalNameCore; // Already contains prefix, or prefix is the start of the core
            }
            // Ensure a space if both prefix and core are non-empty and core doesn't start with the prefix already
            return `${filenamePrefix} ${finalNameCore}`.trim(); // Trim in case finalNameCore was empty
        }
        
        return finalNameCore;
    }
}

// ===================================
// Border finder - finds the gap and borders
// ===================================
class BorderFinder {
    static MIN_IMAGE_DIMENSION = 10;
    static MAXIMIZE_BORDER_CROP = true;
    static SOFT_GAP_CROP = true;

    // Thresholds for color consistency detection
    static DELTA_E_SIMILARITY_THRESHOLD = 15.0;     // Perceptual difference for determining similarity of RGB (Delta E 76)
    static DELTA_E_DIFFERENCE_THRESHOLD = 45.0;     // Perceptual difference for determining difference of RGB (Delta E 76)
    static ALPHA_DIFF_THRESHOLD = 10;               // Absolute difference for alpha channel
    static CONSISTENCY_SIMILARITY_THRESHOLD = 0.99; // Target for augmented dominant color percentage similarity
    static CONSISTENCY_DIFFERENCE_THRESHOLD = 0.20; // Target for augmented dominant color percentage difference

    /**
     * Helper to get RGBA color of a pixel from imageData.data.
     */
    static _getPixelColor(data, x, y, imgWidth) {
        const i = (y * imgWidth + x) * 4;
        return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
    }

    /**
     * Converts RGB to XYZ. Assumes R,G,B are 0-255.
     */
    static _rgbToXyz(r, g, b) {
        let R_norm = r / 255;
        let G_norm = g / 255;
        let B_norm = b / 255;
        R_norm = (R_norm > 0.04045) ? Math.pow((R_norm + 0.055) / 1.055, 2.4) : R_norm / 12.92;
        G_norm = (G_norm > 0.04045) ? Math.pow((G_norm + 0.055) / 1.055, 2.4) : G_norm / 12.92;
        B_norm = (B_norm > 0.04045) ? Math.pow((B_norm + 0.055) / 1.055, 2.4) : B_norm / 12.92;
        const X = R_norm * 0.4124564 + G_norm * 0.3575761 + B_norm * 0.1804375;
        const Y = R_norm * 0.2126729 + G_norm * 0.7151522 + B_norm * 0.0721750;
        const Z = R_norm * 0.0193339 + G_norm * 0.1191920 + B_norm * 0.9503041;
        return { x: X * 100, y: Y * 100, z: Z * 100 };
    }

    /**
     * Converts XYZ to CIE L*a*b*. Uses D65 reference white.
     */
    static _xyzToLab(x, y, z) {
        const refX = 95.047, refY = 100.000, refZ = 108.883;
        let xr = x / refX, yr = y / refY, zr = z / refZ;
        const epsilon = 0.008856, kappa = 903.3;
        xr = (xr > epsilon) ? Math.cbrt(xr) : (kappa * xr + 16) / 116;
        yr = (yr > epsilon) ? Math.cbrt(yr) : (kappa * yr + 16) / 116;
        zr = (zr > epsilon) ? Math.cbrt(zr) : (kappa * zr + 16) / 116;
        return { l: (116 * yr) - 16, a: 500 * (xr - yr), b: 200 * (yr - zr) };
    }

    /**
     * Calculates CIE76 Delta E between two L*a*b* colors.
     */
    static _deltaE76(lab1, lab2) {
        const dL = lab1.l - lab2.l, dA = lab1.a - lab2.a, dB = lab1.b - lab2.b;
        return Math.sqrt(dL * dL + dA * dA + dB * dB);
    }
    
    /**
     * Checks if the perceptual color difference (Delta E for RGB, absolute for Alpha)
     * between two RGBA colors is above specified thresholds.
     * Returns true if colors are significantly DIFFERENT, false if they are similar.
     */
    static _isColorDifferenceSignificant(rgba1, rgba2, colorDiffThresholdDeltaE) {
        if (!rgba1 || !rgba2) return true; 
        if (Math.abs(rgba1.a - rgba2.a) > this.ALPHA_DIFF_THRESHOLD) return true;

        const xyz1 = this._rgbToXyz(rgba1.r, rgba1.g, rgba1.b);
        const lab1 = this._xyzToLab(xyz1.x, xyz1.y, xyz1.z);
        const xyz2 = this._rgbToXyz(rgba2.r, rgba2.g, rgba2.b);
        const lab2 = this._xyzToLab(xyz2.x, xyz2.y, xyz2.z);
        const deltaE = this._deltaE76(lab1, lab2);
        if (SIC.DEBUG && colorDiffThresholdDeltaE === this.DELTA_E_DIFFERENCE_THRESHOLD) {
            console.log(`delta E: ${deltaE}`);
        }
        return deltaE > colorDiffThresholdDeltaE;
    }

    // try and contract a bound by looking for an edge determined by a big color difference
    static _contractColumnBounds(consistencyData, imageData, colX, incr, yStart, yEnd, imgWidth) {
        if (SIC.DEBUG) {
            console.log(`col: ${colX}, ${(consistencyData.percent*100).toFixed(1)}%`);
            console.log(consistencyData.dominantColor);
        }
        if (consistencyData.percent >= this.CONSISTENCY_DIFFERENCE_THRESHOLD) {
            const newConsistencyData = this._getColumnConsistency(imageData, colX + incr, yStart, yEnd, imgWidth);
            if (this._isColorDifferenceSignificant(consistencyData.dominantColor, newConsistencyData.dominantColor, this.DELTA_E_DIFFERENCE_THRESHOLD)) {
                if (SIC.DEBUG) {
                    console.log(`Contracting column ${colX} by ${incr}`);
                }
                return colX + incr;
            }
        }
        return colX;
    }

    // try and contract a bound by looking for an edge determined by a big color difference
    static _contractRowBounds(consistencyData, imageData, rowY, incr, xStart, xEnd, imgWidth, imgHeight) {
        if (SIC.DEBUG) {
            console.log(`row: ${rowY}, ${(consistencyData.percent*100).toFixed(1)}%`);
            console.log(consistencyData.dominantColor);
        }
        if (consistencyData.percent >= this.CONSISTENCY_DIFFERENCE_THRESHOLD) {
            const newConsistencyData = this._getRowConsistency(imageData, rowY + incr, xStart, xEnd, imgWidth, imgHeight);
            if (this._isColorDifferenceSignificant(consistencyData.dominantColor, newConsistencyData.dominantColor, this.DELTA_E_DIFFERENCE_THRESHOLD)) {
                if (SIC.DEBUG) {
                    console.log(`Contracting row ${rowY} by ${incr}`);
                }
                return rowY + incr;
            }
        }
        return rowY;
    }

    /**
     * Hybrid consistency check for a column segment.
     * Finds dominant color, then augments its count with perceptually similar colors.
     * @returns {{dominantColor: {r,g,b,a}|null, percent: number, totalPixels: number}}
     * 'percent' is the augmented consistency percentage.
     */
    static _getColumnConsistency(imageData, colX, yStart, yEnd, imgWidth) {
        if (yStart > yEnd || colX < 0 || colX >= imgWidth) {
            return { dominantColor: null, percent: 0, totalPixels: 0 };
        }

        const counts = new Map(); 
        const uniqueColors = new Map(); 
        let totalValidPixels = 0;

        for (let y = yStart; y <= yEnd; y++) {
            const p = this._getPixelColor(imageData.data, colX, y, imgWidth);
            if (p) {
                const pStr = `${p.r},${p.g},${p.b},${p.a}`;
                counts.set(pStr, (counts.get(pStr) || 0) + 1);
                if (!uniqueColors.has(pStr)) uniqueColors.set(pStr, p);
                totalValidPixels++;
            }
        }

        if (totalValidPixels === 0) return { dominantColor: null, percent: 1.0, totalPixels: 0 };

        let initialDominantColorStr = null;
        let initialMaxCount = 0;
        for (const [pStr, count] of counts) {
            if (count > initialMaxCount) {
                initialMaxCount = count;
                initialDominantColorStr = pStr;
            }
        }

        if (!initialDominantColorStr) return { dominantColor: null, percent: 0, totalPixels: totalValidPixels };

        const initialDominantColor = uniqueColors.get(initialDominantColorStr);
        let augmentedDominantCount = initialMaxCount;

        for (const [pStr, count] of counts) {
            if (pStr === initialDominantColorStr) continue;
            const otherColor = uniqueColors.get(pStr);
            if (!this._isColorDifferenceSignificant(initialDominantColor, otherColor, this.DELTA_E_SIMILARITY_THRESHOLD)) {
                augmentedDominantCount += count; // Add count of similar colors
            }
        }
        
        const finalConsistencyPercent = totalValidPixels > 0 ? augmentedDominantCount / totalValidPixels : 1.0;
        if (SIC.DEBUG) {
            if (finalConsistencyPercent < this.CONSISTENCY_SIMILARITY_THRESHOLD) {
                console.log(`Consistency check failed:
    column: ${colX},
    color: ${initialDominantColorStr},
    consistency: ${(finalConsistencyPercent * 100).toFixed(1)}%,
    initial count: ${initialMaxCount},
    augmented count: ${augmentedDominantCount}`);
            }
        }
        return { 
            dominantColor: initialDominantColor,
            percent: finalConsistencyPercent,
            totalPixels: totalValidPixels
        };
    }

    /**
     * Hybrid consistency check for a row segment.
     */
    static _getRowConsistency(imageData, rowY, xStart, xEnd, imgWidth, imgHeight) {
        if (xStart > xEnd || rowY < 0 || rowY >= imgHeight) {
            return { dominantColor: null, percent: 0, totalPixels: 0 };
        }
        
        const counts = new Map();
        const uniqueColors = new Map();
        let totalValidPixels = 0;

        for (let x = xStart; x <= xEnd; x++) {
            const p = this._getPixelColor(imageData.data, x, rowY, imgWidth);
            if (p) {
                const pStr = `${p.r},${p.g},${p.b},${p.a}`;
                counts.set(pStr, (counts.get(pStr) || 0) + 1);
                if (!uniqueColors.has(pStr)) uniqueColors.set(pStr, p);
                totalValidPixels++;
            }
        }

        if (totalValidPixels === 0) return { dominantColor: null, percent: 1.0, totalPixels: 0 };

        let initialDominantColorStr = null;
        let initialMaxCount = 0;
        for (const [pStr, count] of counts) {
            if (count > initialMaxCount) {
                initialMaxCount = count;
                initialDominantColorStr = pStr;
            }
        }
         if (!initialDominantColorStr) return { dominantColor: null, percent: 0, totalPixels: totalValidPixels };

        const initialDominantColor = uniqueColors.get(initialDominantColorStr);
        let augmentedDominantCount = initialMaxCount;

        for (const [pStr, count] of counts) {
            if (pStr === initialDominantColorStr) continue;
            const otherColor = uniqueColors.get(pStr);
            if (!this._isColorDifferenceSignificant(initialDominantColor, otherColor, this.DELTA_E_SIMILARITY_THRESHOLD)) {
                augmentedDominantCount += count;
            }
        }

        const finalConsistencyPercent = totalValidPixels > 0 ? augmentedDominantCount / totalValidPixels : 1.0;
        return { 
            dominantColor: initialDominantColor,
            percent: finalConsistencyPercent,
            totalPixels: totalValidPixels
        };
    }

    /**
     * Gets ImageData from an HTMLImageElement.
     * @param {HTMLImageElement} imageElement - The image to process.
     * @returns {ImageData|null} The ImageData object or null if an error occurs.
     * @private
     */
    static _getImageDataFromImage(imageElement) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageElement.width;
        tempCanvas.height = imageElement.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
            alert('Could not get canvas context for image analysis.');
            return null;
        }
        tempCtx.drawImage(imageElement, 0, 0);
        try {
            return tempCtx.getImageData(0, 0, imageElement.width, imageElement.height);
        } catch (e) {
            console.error("Error getting imageData (cross-origin?):", e);
            alert("Could not analyze image pixels. If it's from another website, please download it first, then upload from your computer.");
            return null;
        }
    }

    static splitAreaInHalfVertically(x, y, width, height) {
        if (width < this.MIN_IMAGE_DIMENSION * 2 || height < this.MIN_IMAGE_DIMENSION) {
             console.warn(`Area ${width}x${height} at (${x},${y}) is too small to split meaningfully.`);
             return null; 
        }
        const w1 = Math.floor(width / 2);
        const w2 = width - w1;

        console.log(`Splitting image in half:
    Img1(x:${x}, y:${y}, w:${w1}, h:${height}),
    Img2(x:${x + w1}, y:${y}, w:${w2}, h:${height})`);

        return {
            region1: { x: x, y: y, width: w1, height: height },
            region2: { x: x + w1, y: y, width: w2, height: height }
        };
    }

    static analyzeAndExtractSubImageRegions_MultiStage(singleImg, img1Height, img2Height, actualSplitPoint = -1) {
        const singleImgWidth = singleImg.width;

        if (singleImgWidth < this.MIN_IMAGE_DIMENSION * 2 || singleImg.height < this.MIN_IMAGE_DIMENSION) {
            return null;
        }

        const imageData = this._getImageDataFromImage(singleImg);
        if (!imageData) {
            return null;
        }

        if (SIC.DEBUG) {
            console.log(`Analyzing image borders and gap with:
    Consistency similarity threshold: ${this.CONSISTENCY_SIMILARITY_THRESHOLD * 100}%,
    Consistency difference threshold: ${this.CONSISTENCY_DIFFERENCE_THRESHOLD * 100}%,
    Similarity Delta E: ${this.DELTA_E_SIMILARITY_THRESHOLD},
    Difference Delta E: ${this.DELTA_E_DIFFERENCE_THRESHOLD},
    Width: ${singleImgWidth}, Split: ${actualSplitPoint},
    Height: (l:${img1Height}, r:${img2Height})`);
        }

        const consistencyData = {};
        // --- Stage 1: Determine Outer Horizontal Crop Points ---
        let outerX1 = singleImgWidth;
        for (let x = 0; x < singleImgWidth; x++) {
            consistencyData.outerX1 = this._getColumnConsistency(imageData, x, 0, img1Height - 1, singleImgWidth);
            if (consistencyData.outerX1.percent < this.CONSISTENCY_SIMILARITY_THRESHOLD) {
                outerX1 = x;
                break;
            }
        }

        let outerX2 = -1; 
        for (let x = singleImgWidth - 1; x >= outerX1; x--) { 
            consistencyData.outerX2 = this._getColumnConsistency(imageData, x, 0, img2Height - 1, singleImgWidth);
            if (consistencyData.outerX2.percent < this.CONSISTENCY_SIMILARITY_THRESHOLD) {
                outerX2 = x;
                break;
            }
        }

        if (outerX1 >= singleImgWidth || outerX2 < 0 || outerX2 < outerX1) { 
            console.warn("Stage 1: Entire image has no valid content.");
            return null;
        }

        const stage1ContentWidth = outerX2 - outerX1 + 1;
        if (stage1ContentWidth < this.MIN_IMAGE_DIMENSION * 2) {
            console.warn(`Stage 1: Content width ${stage1ContentWidth} is too small.`);
            return null;
        }
        if (SIC.DEBUG) {
            console.log(`Stage 1 (find outer X boundaries):
    Outer X-bounds: ${outerX1} to ${outerX2},
    Width: ${stage1ContentWidth}`);
        }

        // --- Stage 2: Split the Stage 1 cropped area and Refine Inner Horizontal Edges to find the Gap ---
        let innerX1 = 0;
        let innerX2 = 0;
        let gapSize = 0;
        let bounds = [ { left: outerX1, width: stage1ContentWidth } ]
        if (actualSplitPoint === -1) {
            bounds.push({ left: 0, width: singleImgWidth });
        }
        let testSplitPoint = 0;
        // look for gap with left and right of cropped image; failing that, original image left and right
        for (const { left, width } of bounds) {
            testSplitPoint = actualSplitPoint !== -1 ? actualSplitPoint : left + Math.floor(width / 2);
            if (SIC.DEBUG) {
                console.log(`Looking for gap at: ${testSplitPoint}`);
            }

            innerX1 = left - 1;
            for (let currentX = testSplitPoint - 1; currentX >= left; currentX--) {
                consistencyData.innerX1 = this._getColumnConsistency(imageData, currentX, 0, img1Height - 1, singleImgWidth);
                if (consistencyData.innerX1.percent < this.CONSISTENCY_SIMILARITY_THRESHOLD) {
                    innerX1 = currentX; 
                    break;
                }
            }

            const right = left + width - 1;
            innerX2 = right + 1;
            for (let currentX = testSplitPoint; currentX <= right; currentX++) {
                consistencyData.innerX2 = this._getColumnConsistency(imageData, currentX, 0, img2Height - 1, singleImgWidth);
                if (consistencyData.innerX2.percent < this.CONSISTENCY_SIMILARITY_THRESHOLD) {
                    innerX2 = currentX; 
                    break;
                }
            }

            gapSize = innerX2 - innerX1 - 1;
            // break early if gap found or if cropped area = original area
            if (gapSize > 0 || width === singleImgWidth) {
                break;
            }
        }

        const img1ProposedWidth = innerX1 - outerX1 + 1;
        const img2ProposedWidth = outerX2 - innerX2 + 1;
        if (SIC.DEBUG) {
            console.log(`Stage 2 (find gap):
    Gap starts at: ${innerX1 + 1}, size: ${gapSize},
    Img1(x:${outerX1}, w:${img1ProposedWidth}),
    Img2(x:${innerX2}, w:${img2ProposedWidth})`);
        }

        if (innerX2 <= innerX1 || 
            img1ProposedWidth < this.MIN_IMAGE_DIMENSION ||
            img2ProposedWidth < this.MIN_IMAGE_DIMENSION) {
            console.warn("Stage 2: Gap refinement invalid.");
            return null;
        }

        // --- Stage 3: Determine Vertical Crop Points Independently for each nominal image ---
        let topY1 = 0, bottomY1 = -1, foundImg1Top = false;
        for (let y = 0; y < img1Height; y++) {
            consistencyData.topY1 = this._getRowConsistency(imageData, y, outerX1, innerX1, singleImgWidth, img1Height);
            if (consistencyData.topY1.percent < this.CONSISTENCY_SIMILARITY_THRESHOLD) {
                topY1 = y; foundImg1Top = true; break;
            }
        }
        if (!foundImg1Top) { 
            console.warn("Stage 3: Left image part has no rows with content.");
        } else {
            bottomY1 = img1Height - 1;
            for (let y = img1Height - 1; y >= topY1; y--) {
                consistencyData.bottomY1 = this._getRowConsistency(imageData, y, outerX1, innerX1, singleImgWidth, img1Height);
                if (consistencyData.bottomY1.percent < this.CONSISTENCY_SIMILARITY_THRESHOLD) {
                    bottomY1 = y; break;
                }
            }
        }

        let topY2 = 0, bottomY2 = -1, foundImg2Top = false;
        for (let y = 0; y < img2Height; y++) {
            consistencyData.topY2 = this._getRowConsistency(imageData, y, innerX2, outerX2, singleImgWidth, img2Height);
            if (consistencyData.topY2.percent < this.CONSISTENCY_SIMILARITY_THRESHOLD) {
                topY2 = y; foundImg2Top = true; break;
            }
        }
        if (!foundImg2Top) {
            console.warn("Stage 3: Right image part has no rows with content.");
        } else {
            bottomY2 = img2Height - 1;
            for (let y = img2Height - 1; y >= topY2; y--) {
                consistencyData.bottomY2 = this._getRowConsistency(imageData, y, innerX2, outerX2, singleImgWidth, img2Height);
                if (consistencyData.bottomY2.percent < this.CONSISTENCY_SIMILARITY_THRESHOLD) {
                    bottomY2 = y; break;
                }
            }
        }
        if (SIC.DEBUG) {
            console.log(`Stage 3 (find outer Y boundaries):
    Img1 Y-bounds: ${topY1} - ${bottomY1},
    Img2 Y-bounds: ${topY2} - ${bottomY2}`);
        }

        const img1ProposedHeight = (bottomY1 < topY1) ? 0 : (bottomY1 - topY1 + 1);
        const img2ProposedHeight = (bottomY2 < topY2) ? 0 : (bottomY2 - topY2 + 1);

        // If EITHER image's determined height is too small, trigger fallback.
        if (img1ProposedHeight < this.MIN_IMAGE_DIMENSION || img2ProposedHeight < this.MIN_IMAGE_DIMENSION) {
            console.warn(`Stage 3:
Height for one or both images is too small:
    H1: ${img1ProposedHeight}, H2: ${img2ProposedHeight}`);
            return null;
        }

        // --- Stage 4: Try and contract the bounds a bit more by looking for transition edges ---
        if (SIC.DEBUG) {
            console.log(`Stage 4 (try to contract boundaries):`);
        }

        // contract left and right image X bounds
        outerX1 = this._contractColumnBounds(consistencyData.outerX1, imageData, outerX1, 1, topY1, bottomY1, singleImgWidth);
        outerX2 = this._contractColumnBounds(consistencyData.outerX2, imageData, outerX2, -1, topY2, bottomY2, singleImgWidth);
        innerX1 = this._contractColumnBounds(consistencyData.innerX1, imageData, innerX1, -1, topY1, bottomY1, singleImgWidth);
        innerX2 = this._contractColumnBounds(consistencyData.innerX2, imageData, innerX2, 1, topY2, bottomY2, singleImgWidth);
        gapSize = innerX2 - innerX1 - 1;

        // contract left and right image Y bounds
        topY1 = this._contractRowBounds(consistencyData.topY1, imageData, topY1, 1, outerX1, innerX1, singleImgWidth, img1Height);
        bottomY1 = this._contractRowBounds(consistencyData.bottomY1, imageData, bottomY1, -1, outerX1, innerX1, singleImgWidth, img1Height);
        topY2 = this._contractRowBounds(consistencyData.topY2, imageData, topY2, 1, innerX2, outerX2, singleImgWidth, img2Height);
        bottomY2 = this._contractRowBounds(consistencyData.bottomY2, imageData, bottomY2, -1, innerX2, outerX2, singleImgWidth, img2Height);

        // --- Stage 5: Define Final image Regions ---
        const region1W = innerX1 - outerX1 + 1;
        const region2W = outerX2 - innerX2 + 1;
        const region1H = bottomY1 - topY1 + 1;
        const region2H = bottomY2 - topY2 + 1;
        const splitPoint = actualSplitPoint !== -1 ? actualSplitPoint : innerX1 + 1 + Math.floor(gapSize / 2);

        console.log(`Stage 5 (define image regions):
Gap size: ${gapSize}, split at: ${splitPoint},
Border(l:${outerX1}, r:${singleImgWidth - outerX2 - 1},
    t:(l:${topY1}, r:${topY2}), b:(l:${img1Height - bottomY1 - 1}, r:${img2Height - bottomY2 - 1})),
Img1(x:${outerX1}, y:${topY1}, w:${region1W}, h:${region1H}),
Img2(x:${innerX2}, y:${topY2}, w:${region2W}, h:${region2H})`);

        // --- Stage 6: Define crop boundaries
        let cropY = 0, cropWidth = 0, cropHeight = 0;

        // find the width of the images including the borders but not including the gap
        const widthWithoutGap1 = innerX1 + 1;
        const widthWithoutGap2 = singleImgWidth - innerX2;

        // determine boundaries based on whether we are cropping to the outer boundaries of the two images, or maximizing the border crop 
        if (this.MAXIMIZE_BORDER_CROP) {
            // Calculate min crop width, constrained by smallest image width
            cropWidth = Math.min(Math.min(region1W, region2W), widthWithoutGap1, widthWithoutGap2);
            // crop out border region of both images at top and bottom
            cropY = Math.max(topY1, topY2);
            // Calculate min crop height, constrained by overall image height
            cropHeight = Math.min(Math.min(topY1 + region1H, topY2 + region2H), img1Height, img2Height) - cropY;
        } else {
            // Calculate max crop width, constrained by smallest image width
            cropWidth = Math.min(Math.max(region1W, region2W), widthWithoutGap1, widthWithoutGap2);
            // crop out border region of highest / lowest image at top and bottom
            cropY = Math.min(topY1, topY2);
            // Calculate max crop height, constrained by overall image height
            cropHeight = Math.min(Math.max(topY1 + region1H, topY2 + region2H), img1Height, img2Height) - cropY;
        }

        // crop the gap
        const cropX1 = widthWithoutGap1 - cropWidth;
        const cropX2 = this.SOFT_GAP_CROP ? innerX2 - splitPoint : 0;

        // see if we need to crop
        const needsCrop =
            (gapSize && this.SOFT_GAP_CROP) ||
            cropX1 || cropX2 || cropY ||
            (cropHeight < singleImg.height);

        let cropBoundaries = null;
        if (needsCrop) {
            cropBoundaries = { cropX1, cropX2, cropY, cropWidth, cropHeight } 
            console.log(`Stage 6 (define crop boundaries):
Crop(x1:${cropX1}, x2:${cropX2}, y:${cropY}, w:${cropWidth}, h:${cropHeight})`);

        } else {
            console.log(`Stage 6 (define crop boundaries):
No crop needed`);
        }

        return {
            region1: { x: outerX1, y: topY1, width: region1W, height: region1H },
            region2: { x: innerX2, y: topY2, width: region2W, height: region2H },
            img1Height,
            img2Height,
            splitPoint,
            cropBoundaries
        };
    }
}

// ===================================
// STORAGE MANAGER - Handles localStorage operations
// ===================================
class StorageManager {
    static getItem(item, defaultVal) {
        try {
            let value = localStorage.getItem(item);
            if (value === null) {
                return defaultVal;
            } else if (typeof defaultVal === "number") {
                value = parseFloat(value);
                return isFinite(value) ? value : defaultVal;
            } else if (typeof defaultVal === "boolean") {
                return value === "true";
            } else {
                return value;
            }
        } catch(e) {
            return defaultVal;
        }
    }

    static setItem(item, value) {
        try {
            localStorage.setItem(item, value);
            return true;
        } catch(e) {
            return false;
        }
    }
}

// ===================================
// IMAGE RENDERER - Handles all image rendering operations
// ===================================
class ImageRenderer {
    static BODY_BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--body-bg-color').trim();
    static DEFAULT_SCALE_PERCENT = 1;
    static scale = 1;
    static maxScale = 1;

    static currentScalePercent() {
        return this.scale / this.maxScale;
    }

    static calculateMaxScale(img1, img2, overlaid = false, borders = true) {
        let totalWidthAt100;
        let imageHeight = Math.max(img1.height, img2.height);

        if (!overlaid) {
            const gapWidthAt100 = Math.round(this.pixelGap(img1, img2) / UIManager.GAP_TO_BORDER_RATIO) * UIManager.GAP_TO_BORDER_RATIO;
            const borderSpace = UIManager.hasBorders && borders ? gapWidthAt100 / UIManager.GAP_TO_BORDER_RATIO : 0;
            totalWidthAt100 = img1.width + img2.width + gapWidthAt100 + borderSpace * 2;
            imageHeight += borderSpace * 2;
        } else {
            totalWidthAt100 = Math.max(img1.width, img2.width);
        }

        const maxHeight = screen.height;
        const viewportWidth = DisplayManager.getViewPortWidth();
        const optimalScale = viewportWidth / totalWidthAt100;

        return Math.min(maxHeight / imageHeight, optimalScale);
    }

    static setScalePercent(scalePercent, newMaxScale = this.maxScale) {
        this.scale = Math.min(scalePercent * newMaxScale, newMaxScale);
        this.maxScale = newMaxScale;
        const displayScale = Math.round(this.scale / this.maxScale * 100);
        UIManager.domElements.scaleSlider.value = displayScale;
        UIManager.domElements.scaleValue.textContent = `${displayScale}%`;
    }

    static pixelGap(img1, img2) {
        const avgWidth = (img1.width + img2.width) / 2;
        return avgWidth * (UIManager.gapPercent / 100);
    }

    static renderCombinedImage(targetCanvas, renderScale, renderLog, doRender) {
        const images = SIC.images;
        if (images.length !== 2) return null;

        // Calculate gap and border spacing
        let renderGap = this.pixelGap(images[0], images[1]) * renderScale;
        const borderSpace = UIManager.hasBorders ? Math.round(renderGap / UIManager.GAP_TO_BORDER_RATIO) : 0;
        renderGap = Math.round(renderGap);

        // Calculate dimensions
        const img1Width = Math.round(images[0].width * renderScale);
        const img2Width = Math.round(images[1].width * renderScale);
        const rightImgStart = img1Width + renderGap;
        const totalWidth = rightImgStart + img2Width + (borderSpace * 2);

        const img1Height = Math.round(images[0].height * renderScale);
        const img2Height = Math.round(images[1].height * renderScale);
        const maxImageHeight = Math.max(img1Height, img2Height);
        const maxHeight = maxImageHeight + (borderSpace * 2);

        if (renderLog) {
            console.log(`Rendering image with:
    gap: ${renderGap}, border: ${borderSpace},
    left image: (w: ${img1Width}, h: ${img1Height}),
    right image: (w: ${img2Width}, h: ${img2Height}),
    total size: (w: ${totalWidth}, h: ${maxHeight})`);
        }

        if (doRender) {
            const ctx = targetCanvas.getContext('2d');
            // Set canvas dimensions
            targetCanvas.width = totalWidth;
            targetCanvas.height = maxHeight;

            // Handle background fill
            if (UIManager.isTransparent) {
                ctx.clearRect(0, 0, totalWidth, maxHeight);
            } else {
                ctx.fillStyle = UIManager.gapColor;
                ctx.fillRect(0, 0, totalWidth, maxHeight);
            }

            // Handle rounded corners
            ctx.save();
            if (UIManager.cornerRadiusPercent > 0) {
                const maxRadius = Math.min(img1Width, img2Width, img1Height, img2Height) / 2;
                const renderCornerRadius = UIManager.cornerRadiusPercent / 100 * maxRadius;

                ctx.beginPath();
                
                // Left image clipping region
                ctx.roundRect(
                    borderSpace,
                    borderSpace,
                    img1Width,
                    img1Height,
                    renderCornerRadius
                );
                
                // Right image clipping region
                ctx.roundRect(
                    rightImgStart + borderSpace,
                    borderSpace,
                    img2Width,
                    img2Height,
                    renderCornerRadius
                );
                
                ctx.clip();
            }

            // Draw left image
            ctx.drawImage(
                images[0],
                0, 0,
                images[0].width, images[0].height,
                borderSpace, borderSpace,
                img1Width, img1Height
            );

            // Draw right image
            ctx.drawImage(
                images[1],
                0, 0,
                images[1].width, images[1].height,
                rightImgStart + borderSpace, borderSpace,
                img2Width, img2Height
            );
            ctx.restore();
        }

        return { totalWidth, totalHeight: maxHeight };
    }

    static drawImages() {
        this.renderCombinedImage(UIManager.domElements.canvas, this.scale, false, true);
    }
}

// ===================================
// DISPLAY MANAGER - Handles display modes, screen adjustments and rendering context
// ===================================
class DisplayManager {
    static initialize() {
        this.setupFullscreenButton();
        this.setupFullscreenEvents();
        this.setupResizeHandler();
    }

    static setupFullscreenButton() {
        const canvasContainer = UIManager.domElements.canvasContainer;
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

        canvasContainer.style.position = 'relative';
        canvasContainer.appendChild(fullscreenButton);

        // Show button when canvas is displayed
        const observer = new MutationObserver(() => {
            if (canvasContainer.style.display !== 'none') {
                fullscreenButton.style.display = 'flex';
            }
        });
        observer.observe(canvasContainer, { attributes: true });

        fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
        this.fullscreenButton = fullscreenButton;
    }

    static setupFullscreenEvents() {
        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        events.forEach(event => {
            document.addEventListener(event, () => this.handleFullscreenChange());
        });

        // Add fullscreen styles
        const style = document.createElement('style');

        const fullscreenContainerStyles = `
            background-color: ${ImageRenderer.BODY_BG_COLOR};
            padding: 0px;
            display: flex !important;
            align-items: center;
            justify-content: center;
            overflow: auto;
        `;

        const fullscreenCanvasStyles = `
            max-width: 100%;
            max-height: 100%;
        `;

        // Apply the styles separately for each selector
        style.textContent = `
            #canvasContainer:fullscreen {
                ${fullscreenContainerStyles}
            }
            #canvasContainer:-webkit-full-screen {
                ${fullscreenContainerStyles}
            }
            #canvasContainer:-moz-full-screen {
                ${fullscreenContainerStyles}
            }
            #canvasContainer:-ms-fullscreen {
                ${fullscreenContainerStyles}
            }

            #canvasContainer:fullscreen #canvas {
                ${fullscreenCanvasStyles}
            }
            #canvasContainer:-webkit-full-screen #canvas {
                ${fullscreenCanvasStyles}
            }
            #canvasContainer:-moz-full-screen #canvas {
                ${fullscreenCanvasStyles}
            }
            #canvasContainer:-ms-fullscreen #canvas {
                ${fullscreenCanvasStyles}
            }
        `;
        document.head.appendChild(style);
    }

    static setupResizeHandler() {
        // Listen for window resize events
        window.addEventListener('resize', () => this.handleResize());
    }

    static handleResize() {
        if (SIC.images.length === 2) {
            if (CropManager.isCropping) {
                CropManager.onScaleChange(0);
            } else {
                const optimalScale = ImageRenderer.calculateMaxScale(
                    SIC.images[0], 
                    SIC.images[1]
                );
                ImageRenderer.setScalePercent(
                    ImageRenderer.currentScalePercent(), 
                    optimalScale
                );
                ImageRenderer.drawImages();
            }
        }
    }

    static isFullscreen() {
        return document.fullscreenElement || 
            document.webkitFullscreenElement || 
            document.mozFullScreenElement || 
            document.msFullscreenElement;
    }

    static handleFullscreenChange() {
        if (this.isFullscreen()) {
            this.fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7"></path></svg>';
        } else {
            this.fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
        }
        
        // Allow time for fullscreen transition to complete, then resize
        setTimeout(() => this.handleResize(), 250);
    }

    static toggleFullscreen() {
        const element = UIManager.domElements.canvasContainer;
        
        if (!this.isFullscreen()) {
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
        }
    }

    static getViewPortWidth() {
        const mainContainer = document.getElementById('main-container');
        const isVerticalLayout = window.getComputedStyle(mainContainer).flexDirection === 'column';
        const leftPanelWidth = document.fullscreenElement ? 0 : document.getElementById('left-panel').offsetWidth;
        return isVerticalLayout ? window.innerWidth - 15 : window.innerWidth - leftPanelWidth - 50;
    }

    static isMobile() {
        return window.innerWidth <= 768 || window.innerHeight <= 600;
    }

    static isPortrait() {
        return window.innerHeight > window.innerWidth;
    }
}

// ===================================
// HELP MANAGER - Handles help functionality
// ===================================
class HelpManager {
    static initialize() {
        const headerContainer = document.querySelector('.header-container');
        const helpIconContainer = document.createElement('div');
        helpIconContainer.className = 'help-icon';
        helpIconContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #333333;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            transition: background-color 0.2s;
            position: absolute;
            right: 60px;
            cursor: pointer;
        `;

        helpIconContainer.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9.09 9.00001C9.3251 8.33167 9.78915 7.76811 10.4 7.40914C11.0108 7.05016 11.7289 6.91894 12.4272 7.03873C13.1255 7.15852 13.7588 7.52154 14.2151 8.06354C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 17H12.01" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        helpIconContainer.addEventListener('mouseover', () => {
            helpIconContainer.style.backgroundColor = '#444444';
        });

        helpIconContainer.addEventListener('mouseout', () => {
            helpIconContainer.style.backgroundColor = '#333333';
        });

        helpIconContainer.addEventListener('click', this.openHelp);
        headerContainer.appendChild(helpIconContainer);
    }

    static openHelp() {
        window.open('help.html', '_blank');
    }
}

// ===================================
// APPLICATION INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    SIC.initialize();
});