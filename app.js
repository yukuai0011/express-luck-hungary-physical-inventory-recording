// Global variables
let profileData = {
    apiEndpoint: null,
    orderNo: null,
    recordingNo: null,
    locationCode: null
};

let scannedData = {
    api: false,
    info: false
};

let qrScanner = null;
let barcodeScanner = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadProfile();
    updateSetupUI();
});

// Tab switching
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-button');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (tabName === 'setup') {
        document.getElementById('setupTab').classList.add('active');
        buttons[0].classList.add('active');
    } else {
        document.getElementById('workTab').classList.add('active');
        buttons[1].classList.add('active');
        loadProfile();
        updateWorkUI();
    }
}

// QR Code Scanning
function startQRScanning() {
    const videoContainer = document.getElementById('videoContainer');
    videoContainer.style.display = 'block';
    
    qrScanner = new Html5Qrcode("qrVideo");
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    qrScanner.start(
        { facingMode: "environment" },
        config,
        onQRScanSuccess,
        onQRScanError
    ).catch(err => {
        showStatus('setupStatus', 'Camera access denied or not available', 'error');
        console.error(err);
    });
}

function stopQRScanning() {
    if (qrScanner) {
        qrScanner.stop().then(() => {
            document.getElementById('videoContainer').style.display = 'none';
        }).catch(err => console.error(err));
    }
}

function onQRScanSuccess(decodedText) {
    try {
        const data = JSON.parse(decodedText);
        
        // Check if it's API endpoint data
        if (data.apiEndpoint) {
            profileData.apiEndpoint = data.apiEndpoint;
            scannedData.api = true;
            showStatus('setupStatus', 'API Endpoint scanned successfully!', 'success');
        }
        // Check if it's order info data
        else if (data.orderNo && data.locationCode) {
            profileData.orderNo = data.orderNo;
            profileData.recordingNo = data.recordingNo;
            profileData.locationCode = data.locationCode;
            scannedData.info = true;
            showStatus('setupStatus', 'Order information scanned successfully!', 'success');
        }
        
        updateSetupUI();
        
        // Stop scanning if both QR codes are scanned
        if (scannedData.api && scannedData.info) {
            stopQRScanning();
            showStatus('setupStatus', 'Both QR codes scanned! Review and save your profile.', 'success');
        }
    } catch (e) {
        showStatus('setupStatus', 'Invalid QR code format', 'error');
    }
}

function onQRScanError(errorMessage) {
    // Ignore scan errors, they happen frequently during scanning
}

function updateSetupUI() {
    const count = (scannedData.api ? 1 : 0) + (scannedData.info ? 1 : 0);
    document.getElementById('scannedCount').textContent = count;
    
    if (count > 0) {
        document.getElementById('profilePreview').style.display = 'block';
        document.getElementById('previewEndpoint').textContent = profileData.apiEndpoint || '-';
        document.getElementById('previewOrderNo').textContent = profileData.orderNo || '-';
        document.getElementById('previewRecordingNo').textContent = profileData.recordingNo || '-';
        document.getElementById('previewLocationCode').textContent = profileData.locationCode || '-';
    }
}

// Profile Management
function saveProfile() {
    if (!scannedData.api || !scannedData.info) {
        showStatus('setupStatus', 'Please scan both QR codes before saving', 'error');
        return;
    }
    
    // Save to cookie
    const profileJSON = JSON.stringify(profileData);
    document.cookie = `inventoryProfile=${encodeURIComponent(profileJSON)}; max-age=31536000; path=/`;
    
    showStatus('setupStatus', 'Profile saved successfully!', 'success');
    
    // Reset for new scan
    setTimeout(() => {
        resetSetupForm();
    }, 2000);
}

function loadProfile() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'inventoryProfile') {
            try {
                profileData = JSON.parse(decodeURIComponent(value));
                return true;
            } catch (e) {
                console.error('Failed to load profile', e);
            }
        }
    }
    return false;
}

function deleteProfile() {
    if (confirm('Are you sure you want to delete the current profile?')) {
        document.cookie = 'inventoryProfile=; max-age=0; path=/';
        profileData = {
            apiEndpoint: null,
            orderNo: null,
            recordingNo: null,
            locationCode: null
        };
        updateWorkUI();
        showStatus('workStatus', 'Profile deleted successfully', 'info');
    }
}

function resetSetupForm() {
    scannedData = { api: false, info: false };
    profileData = {
        apiEndpoint: null,
        orderNo: null,
        recordingNo: null,
        locationCode: null
    };
    document.getElementById('profilePreview').style.display = 'none';
    document.getElementById('scannedCount').textContent = '0';
}

// Work UI
function updateWorkUI() {
    const hasProfile = profileData.apiEndpoint && profileData.orderNo;
    
    if (hasProfile) {
        document.getElementById('currentProfile').style.display = 'block';
        document.getElementById('workForm').style.display = 'block';
        document.getElementById('noProfileMessage').style.display = 'none';
        
        document.getElementById('activeOrderNo').textContent = profileData.orderNo;
        document.getElementById('activeRecordingNo').textContent = profileData.recordingNo;
        document.getElementById('activeLocationCode').textContent = profileData.locationCode;
    } else {
        document.getElementById('currentProfile').style.display = 'none';
        document.getElementById('workForm').style.display = 'none';
        document.getElementById('noProfileMessage').style.display = 'block';
    }
}

// Barcode Scanning
function startBarcodeScanning() {
    const videoContainer = document.getElementById('barcodeVideoContainer');
    videoContainer.style.display = 'block';
    
    barcodeScanner = new Html5Qrcode("barcodeVideo");
    
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        formatsToSupport: [ 
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
        ]
    };
    
    barcodeScanner.start(
        { facingMode: "environment" },
        config,
        onBarcodeScanSuccess,
        onBarcodeScanError
    ).catch(err => {
        showStatus('workStatus', 'Camera access denied or not available', 'error');
        console.error(err);
    });
}

function onBarcodeScanSuccess(decodedText) {
    document.getElementById('packageNo').value = decodedText;
    showStatus('workStatus', 'Barcode scanned successfully!', 'success');
    
    if (barcodeScanner) {
        barcodeScanner.stop().then(() => {
            document.getElementById('barcodeVideoContainer').style.display = 'none';
        });
    }
}

function onBarcodeScanError(errorMessage) {
    // Ignore scan errors
}

// Quantity Controls
function toggleQuantityField() {
    const packageIntact = document.getElementById('packageIntact').checked;
    const quantityInput = document.getElementById('quantity');
    const minusBtn = document.getElementById('minusBtn');
    const plusBtn = document.getElementById('plusBtn');
    
    if (packageIntact) {
        quantityInput.disabled = true;
        quantityInput.value = '0';
        minusBtn.disabled = true;
        plusBtn.disabled = true;
    } else {
        quantityInput.disabled = false;
        minusBtn.disabled = false;
        plusBtn.disabled = false;
    }
}

function adjustQuantity(delta) {
    const quantityInput = document.getElementById('quantity');
    const currentValue = parseInt(quantityInput.value) || 0;
    const newValue = Math.max(0, currentValue + delta);
    quantityInput.value = newValue;
}

// Submit Record
async function submitRecord() {
    const packageNo = document.getElementById('packageNo').value.trim();
    const packageIntact = document.getElementById('packageIntact').checked;
    const quantity = packageIntact ? 0 : parseInt(document.getElementById('quantity').value) || 0;
    
    if (!packageNo) {
        showStatus('workStatus', 'Please enter or scan a package number', 'error');
        return;
    }
    
    // Prepare the payload
    const payload = {
        orderNo: profileData.orderNo,
        recordingNo: profileData.recordingNo,
        locationCode: profileData.locationCode,
        packageNo: packageNo,
        packageIntact: packageIntact,
        quantity: quantity
    };
    
    try {
        showStatus('workStatus', 'Submitting record...', 'info');
        
        const response = await fetch(profileData.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showStatus('workStatus', 'Record submitted successfully!', 'success');
            // Reset form
            document.getElementById('packageNo').value = '';
            document.getElementById('packageIntact').checked = false;
            document.getElementById('quantity').value = '0';
            toggleQuantityField();
        } else {
            const errorText = await response.text();
            showStatus('workStatus', `Submission failed: ${response.status} ${response.statusText}`, 'error');
            console.error('Error response:', errorText);
        }
    } catch (error) {
        showStatus('workStatus', `Error submitting record: ${error.message}`, 'error');
        console.error('Submission error:', error);
    }
}

// Helper Functions
function showStatus(elementId, message, type) {
    const statusElement = document.getElementById(elementId);
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}
