# NFC Hardware Testing

Python-based NFC reader simulator for validating Virtual Leap Card tap transactions.

## Purpose

Simulates a transit gate NFC reader to measure real-world transaction performance and validate APDU communication between the mobile app and hardware reader.

## Requirements

- ACR122U NFC card reader (or compatible PC/SC reader)
- Python 3.8+
- pyscard library
- customtkinter (for GUI)

## Installation
```bash
pip install pyscard customtkinter
```

## Usage
```bash
python transit_gate_simulator.py
```

**What it does:**
1. Detects card tap via NFC reader
2. Sends SELECT AID command
3. Sends DEDUCT FARE command  
4. Measures total transaction time
5. Displays results in GUI

## Results

Average transaction time: **318ms**
- SELECT command: ~150ms
- DEDUCT command: ~168ms

## Implementation Note

This testing tool was built with AI assistance to validate hardware NFC communication. The core project focus is the React Native/Android HCE mobile implementation.