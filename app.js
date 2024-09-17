const toggleModeButton = document.getElementById('toggle-mode');
let isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches || document.body.classList.contains('dark-mode');
toggleModeButton.textContent = isDarkMode ? 'light_mode' : 'dark_mode';

toggleModeButton.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    isDarkMode = !isDarkMode;
    toggleModeButton.textContent = isDarkMode ? 'light_mode' : 'dark_mode';
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    isDarkMode = e.matches;
    toggleModeButton.textContent = isDarkMode ? 'light_mode' : 'dark_mode';
});

let canvas = document.getElementById('image-canvas');
let ctx = canvas.getContext('2d');
let image = new Image();
let currentImageData;
let originalImageData;

let scaleSlider = document.getElementById('scale-slider');
let brightnessSlider = document.getElementById('brightness-slider');
let contrastSlider = document.getElementById('contrast-slider');
let midtonesSlider = document.getElementById('midtones-slider');
let softnessSlider = document.getElementById('softness-slider');

let scaleValue = document.getElementById('scale-value');
let brightnessValue = document.getElementById('brightness-value');
let contrastValue = document.getElementById('contrast-value');
let midtonesValue = document.getElementById('midtones-value');
let softnessValue = document.getElementById('softness-value');

canvas.addEventListener('dragover', (event) => {
    event.preventDefault();
});

canvas.addEventListener('drop', (event) => {
    event.preventDefault();
    let file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        let reader = new FileReader();
        reader.onload = function (e) {
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('open-image').addEventListener('click', () => {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.click();

    input.onchange = (event) => {
        let file = event.target.files[0];
        let reader = new FileReader();
        reader.onload = function (e) {
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };
});

image.onload = () => {
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyDithering();
};

[scaleSlider, brightnessSlider, contrastSlider, midtonesSlider, softnessSlider].forEach((element) => {
    element.addEventListener('input', applyDithering);
});

document.querySelectorAll('.reset-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        let sliderId = event.target.getAttribute('data-reset');
        let slider = document.getElementById(sliderId);
        if (sliderId === 'scale-slider') {
            slider.value = 5;
        } else {
            slider.value = 0;
        }
        applyDithering();
    });
});

function applyDithering() {
    if (!currentImageData) return;

    let imageData = new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height);
    scaleValue.textContent = scaleSlider.value;
    adjustBrightness(imageData, brightnessSlider.value);
    brightnessValue.textContent = brightnessSlider.value;
    adjustContrast(imageData, contrastSlider.value);
    contrastValue.textContent = contrastSlider.value;
    adjustMidtones(imageData, midtonesSlider.value);
    midtonesValue.textContent = midtonesSlider.value;
    toGrayscale(imageData);
    applyBayerDithering(imageData, parseInt(scaleSlider.value));
    ctx.putImageData(imageData, 0, 0);
    applySoftness(softnessSlider.value);
    softnessValue.textContent = softnessSlider.value;
    currentImageData = imageData;
}

function adjustBrightness(imageData, brightness) {
    let adjustment = brightness / 100 * 255;
    for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] += adjustment;
        imageData.data[i + 1] += adjustment;
        imageData.data[i + 2] += adjustment;
    }
}

function adjustContrast(imageData, contrastValue) {
    const contrastFactor = (contrastValue / 100);
    const midpoint = 127.5;
    for (let i = 0; i < imageData.data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            let pixel = imageData.data[i + j];
            let newValue = midpoint + (pixel - midpoint) * (1 + contrastFactor);
            imageData.data[i + j] = Math.min(255, Math.max(0, newValue));
        }
    }
}

function adjustMidtones(imageData, midtoneValue) {
    let adjustment = midtoneValue / 100 * 255;
    for (let i = 0; i < imageData.data.length; i += 4) {
        let r = imageData.data[i], g = imageData.data[i + 1], b = imageData.data[i + 2];
        let avg = (r + g + b) / 3;
        let factor = avg + adjustment;
        imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = Math.min(255, Math.max(0, factor));
    }
}

function toGrayscale(imageData) {
    for (let i = 0; i < imageData.data.length; i += 4) {
        let grayValue = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
        imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = grayValue;
    }
}

function applySoftness(softness) {
    if (softness < 0) {
        applyBlur(Math.abs(softness));
    } else if (softness > 0) {
        applySharpen(softness);
    }
}

function applyBlur(strength) {
    let blurRadius = Math.floor(strength / 10);
    for (let i = 0; i < blurRadius; i++) {
        blurCanvas();
    }
}

function blurCanvas() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    let width = imageData.width;
    let height = imageData.height;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let index = (y * width + x) * 4;
            let neighbors = [
                ((y - 1) * width + (x - 1)) * 4,
                ((y - 1) * width + x) * 4,
                ((y - 1) * width + (x + 1)) * 4,
                ((y * width + (x - 1)) * 4),
                ((y * width + (x + 1)) * 4),
                ((y + 1) * width + (x - 1)) * 4,
                ((y + 1) * width + x) * 4,
                ((y + 1) * width + (x + 1)) * 4
            ];

            let avg = neighbors.reduce((sum, idx) => sum + data[idx], 0) / neighbors.length;
            data[index] = data[index + 1] = data[index + 2] = avg;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function applySharpen(strength) {
    let sharpenFactor = strength / 100;
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    let width = imageData.width;
    let height = imageData.height;

    let sharpenKernel = [
        [0, -sharpenFactor, 0],
        [-sharpenFactor, 1 + (4 * sharpenFactor), -sharpenFactor],
        [0, -sharpenFactor, 0]
    ];

    for (let y = 1; y < height; y++) {
        for (let x = 1; x < width; x++) {
            let index = (y * width + x) * 4;
            let newValue = applyKernel(sharpenKernel, x, y, width, height, data);
            data[index] = data[index + 1] = data[index + 2] = newValue;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function applyBayerDithering(imageData, scale) {
    let bayerMatrix = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ];
    let matrixSize = 4;
    let scaleFactor = Math.max(1, scale);

    for (let y = 0; y < imageData.height; y += scaleFactor) {
        for (let x = 0; x < imageData.width; x += scaleFactor) {
            let index = (y * imageData.width + x) * 4;
            let grayValue = imageData.data[index];
            let threshold = (bayerMatrix[(y / scaleFactor) % matrixSize][(x / scaleFactor) % matrixSize] / 16) * 255;
            let newColor = grayValue < threshold ? 0 : 255;

            for (let dx = 0; dx < scaleFactor && x + dx < imageData.width; dx++) {
                for (let dy = 0; dy < scaleFactor && y + dy < imageData.height; dy++) {
                    let pixelIndex = ((y + dy) * imageData.width + (x + dx)) * 4;
                    imageData.data[pixelIndex] = imageData.data[pixelIndex + 1] = imageData.data[pixelIndex + 2] = newColor;
                }
            }
        }
    }
}

document.getElementById('save-image').addEventListener('click', () => {
    let link = document.createElement('a');
    link.download = 'dithered-image.png';
    link.href = canvas.toDataURL();
    link.click();
});

window.addEventListener('resize', () => {
    resizeCanvas();
    if (currentImageData) {
        ctx.putImageData(currentImageData, 0, 0);
    }
});

function resizeCanvas() {
    if (image.src) {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
    }
}
