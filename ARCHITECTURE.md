# Application Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Header    │  │  Profile   │  │   Work     │            │
│  │ Component  │  │  Section   │  │  Section   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                        │                │                    │
│                        └────────┬───────┘                    │
│                                 │                            │
│                        ┌────────▼────────┐                  │
│                        │ Scanner Modal   │                  │
│                        │ (Camera)        │                  │
│                        └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                                │
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Profile Management                                 │    │
│  │  • QR Code Parsing                                  │    │
│  │  • Data Validation                                  │    │
│  │  • Profile Storage/Retrieval                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Package Processing                                 │    │
│  │  • Barcode Scanning                                 │    │
│  │  • Quantity Calculation                             │    │
│  │  • Payload Construction                             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                                │
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────┐          ┌──────────────┐                │
│  │ AsyncStorage │          │   API Client │                │
│  │ (Local Data) │          │  (Network)   │                │
│  └──────────────┘          └──────────────┘                │
│         │                          │                         │
│         │                          │                         │
│    ┌────▼────┐              ┌─────▼─────┐                 │
│    │ Profile │              │  Power    │                  │
│    │  Data   │              │ Automate  │                  │
│    └─────────┘              │  Endpoint │                  │
│                             └───────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App.tsx
│
├── Header.tsx
│
├── ProfileSection.tsx
│   ├── QR Scanner Logic
│   ├── JSON Parser
│   ├── Bearer Token Input
│   └── ScannerModal.tsx
│       └── Expo Camera
│
└── WorkSection.tsx
    ├── Package Input
    ├── Barcode Scanner
    ├── Quantity Controls
    ├── Submit Logic
    └── ScannerModal.tsx
        └── Expo Camera
```

## Data Flow

### Profile Setup Flow
```
1. User Action: Tap "Scan QR"
   │
2. Open ScannerModal
   │
3. Expo Camera → Scan QR Code
   │
4. Parse JSON:
   ├─> API Endpoint QR
   │   └─> Store scannedApi
   └─> Recording Info QR
       └─> Store scannedInfo
   │
5. User: Tap "Save Profile"
   │
6. Combine Data → Profile Object
   │
7. AsyncStorage.setItem('inventoryProfile', profile)
   │
8. Profile Ready ✓
```

### Package Submission Flow
```
1. User Action: Enter/Scan Package Number
   │
2. Set Package Intact Checkbox
   │
3. Set Quantity (if not intact)
   │
4. User: Tap "Submit"
   │
5. Load Profile from AsyncStorage
   │
6. Validate Data
   │
7. Construct Payload:
   {
     orderNo,
     recordingNo,
     locationCode,
     packageNo,
     quantity,
     packageIntact
   }
   │
8. Add Headers:
   • Content-Type: application/json
   • x-ms-client-tracking-id: UUID
   • Authorization: Bearer {token} (if exists)
   │
9. POST to API Endpoint
   │
10. Handle Response:
    ├─> Success → Show confirmation
    └─> Error → Display error message
```

## Storage Schema

### AsyncStorage Keys
```typescript
'inventoryProfile' → {
  apiEndpoint: string
  orderNo: string
  recordingNo: number
  locationCode: string
  bearerToken?: string
}
```

## API Integration

### Request Format
```http
POST {apiEndpoint}
Content-Type: application/json
Accept: application/json
x-ms-client-tracking-id: {uuid}
Authorization: Bearer {token}  (optional)

{
  "orderNo": "1234",
  "recordingNo": 1,
  "locationCode": "FG HU",
  "packageNo": "R2500041512",
  "quantity": 0,
  "packageIntact": true
}
```

### Response Handling
```
Response → Parse Content-Type
├─> application/json → Parse as JSON
└─> other → Parse as text

Display Result in UI
```

## Build Pipeline

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Actions Workflow                                 │
│                                                           │
│  Trigger: Push to any branch                             │
│                                                           │
│  ┌────────────────┐          ┌────────────────┐         │
│  │ Build Android  │          │ Build Windows  │         │
│  │                │          │                │         │
│  │ 1. Setup SDK   │          │ 1. Setup Node  │         │
│  │ 2. Prebuild    │          │ 2. Export Web  │         │
│  │ 3. Gradle      │          │ 3. Electron    │         │
│  │ 4. APK Output  │          │ 4. EXE Output  │         │
│  └────────┬───────┘          └────────┬───────┘         │
│           │                           │                  │
│           └───────────┬───────────────┘                  │
│                       │                                  │
│              ┌────────▼─────────┐                        │
│              │   Upload         │                        │
│              │   Artifacts      │                        │
│              └──────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

## Platform-Specific Architecture

### Android
```
React Native App
    │
    ├─> Expo Camera (native module)
    ├─> AsyncStorage (native module)
    │
    └─> Compiled to APK
        └─> Runs on Android device
```

### Windows
```
React Native App
    │
    ├─> Export to Web Bundle
    │
    └─> Electron Wrapper
        ├─> Loads Web Bundle
        └─> Creates EXE
```

### Web
```
React Native App
    │
    ├─> React Native Web
    │
    └─> Standard Web App
        └─> Runs in Browser
```

## State Management

```
App.tsx (Root State)
    │
    ├─> profile: Profile | null
    │   └─> Loaded from AsyncStorage on mount
    │
    └─> Pass Down:
        ├─> ProfileSection
        │   ├─> scannedApi: string | null
        │   ├─> scannedInfo: RecordingInfo | null
        │   └─> bearerToken: string
        │
        └─> WorkSection
            ├─> packageNo: string
            ├─> quantity: number
            └─> packageIntact: boolean
```

## Error Handling Strategy

```
User Action
    │
    ├─> Validation Error
    │   └─> Alert.alert() → User notification
    │
    ├─> Network Error
    │   └─> Try-Catch → Display error message
    │
    └─> Permission Error
        └─> Show permission request dialog
```

## Security Layers

```
1. Data Storage
   └─> AsyncStorage (device-only, encrypted by OS)

2. Network Communication
   └─> HTTPS required for API endpoints

3. Authentication
   └─> Optional Bearer Token
       └─> Stored locally, sent in headers

4. No Hardcoded Secrets
   └─> .gitignore prevents committing sensitive files
```

## Offline Capability

```
Network Status
    │
    ├─> Online
    │   └─> Normal Operation
    │       ├─> Load Profile from AsyncStorage
    │       └─> Submit to API
    │
    └─> Offline
        └─> Degraded Mode
            ├─> Load Profile from AsyncStorage ✓
            ├─> Scan QR/Barcodes ✓
            └─> Submit to API ✗ (graceful error)
```

## Future Architecture Enhancements

```
Planned Features:
    │
    ├─> Submission Queue
    │   └─> Store failed submissions
    │       └─> Retry when online
    │
    ├─> State Management
    │   └─> Redux/Zustand for complex state
    │
    └─> Background Sync
        └─> Service workers for web
        └─> Background tasks for mobile
```
