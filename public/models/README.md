# Face-API.js Models

This directory should contain the face-api.js model files for optimal performance. 

## Required Models:
- `tiny_face_detector_model-weights_manifest.json` and associated weight files
- `face_landmark_68_model-weights_manifest.json` and associated weight files  
- `face_expression_model-weights_manifest.json` and associated weight files

## Download Instructions:
You can download these models from the official face-api.js repository:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

## Fallback:
If models are not available locally, the application will automatically fallback to loading them from the CDN, which may be slightly slower but still functional.

## Model Files:
Place the following files in this directory:
- tiny_face_detector_model-weights_manifest.json
- tiny_face_detector_model-shard1.bin
- face_landmark_68_model-weights_manifest.json  
- face_landmark_68_model-shard1.bin
- face_expression_model-weights_manifest.json
- face_expression_model-shard1.bin