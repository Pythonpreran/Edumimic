import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Mic } from 'lucide-react';

interface DeviceSelectorProps {
  onCameraChange: (deviceId: string) => void;
  onMicrophoneChange: (deviceId: string) => void;
}

export default function DeviceSelector({ onCameraChange, onMicrophoneChange }: DeviceSelectorProps) {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');

  useEffect(() => {
    getDevices();
  }, []);

  const getDevices = async () => {
    try {
      console.log('Requesting device permissions...');
      
      // Request permissions first with proper error handling
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        console.log('Device permissions granted');
      } catch (permissionError) {
        console.error('Permission denied for media devices:', permissionError);
        // Try to get devices anyway (some browsers allow enumeration without full permissions)
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('Available devices:', devices);
      
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      console.log('Video devices:', videoDevices);
      console.log('Audio devices:', audioDevices);
      
      setCameras(videoDevices);
      setMicrophones(audioDevices);
      
      // Set default selections
      if (videoDevices.length > 0 && !selectedCamera) {
        const defaultCamera = videoDevices[0].deviceId;
        console.log('Setting default camera:', defaultCamera);
        setSelectedCamera(defaultCamera);
        onCameraChange(defaultCamera);
      }
      
      if (audioDevices.length > 0 && !selectedMicrophone) {
        const defaultMicrophone = audioDevices[0].deviceId;
        console.log('Setting default microphone:', defaultMicrophone);
        setSelectedMicrophone(defaultMicrophone);
        onMicrophoneChange(defaultMicrophone);
      }
      
      // Clean up the stream used for permissions
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  };

  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId);
    onCameraChange(deviceId);
  };

  const handleMicrophoneChange = (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    onMicrophoneChange(deviceId);
  };

  return (
    <div className="space-y-3 pt-4 border-t">
      <h3 className="text-sm font-medium text-muted-foreground">Device Settings</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Camera Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Camera</span>
          </div>
          <Select value={selectedCamera} onValueChange={handleCameraChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((camera) => (
                <SelectItem key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Microphone Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Microphone</span>
          </div>
          <Select value={selectedMicrophone} onValueChange={handleMicrophoneChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent>
              {microphones.map((microphone) => (
                <SelectItem key={microphone.deviceId} value={microphone.deviceId}>
                  {microphone.label || `Microphone ${microphones.indexOf(microphone) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}