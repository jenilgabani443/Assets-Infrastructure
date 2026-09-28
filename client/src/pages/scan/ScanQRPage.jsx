import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  Camera,
  CameraOff,
  Search,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, Button, Input, Select } from '../../components/ui';

export default function ScanQRPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [searching, setSearching] = useState(false);

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'qr-reader-container';

  // Discover available camera devices on mount
  useEffect(() => {
    let mounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (mounted && devices && devices.length > 0) {
          setCameras(devices);
          // Prefer environment/back camera if available
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCamera(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Camera discovery error:', err);
      });

    return () => {
      mounted = false;
      stopScanner();
    };
  }, []);

  // Stop scanning helper
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  // Process decoded QR text or URL
  const handleDecodedText = async (decodedText) => {
    // Stop camera immediately once a code is recognized
    await stopScanner();
    toast.success('Asset code captured!');

    // 1. Check if decoded text is a full URL containing /assets/:id
    const urlMatch = decodedText.match(/\/assets\/([a-f\d]{24})/i);
    if (urlMatch && urlMatch[1]) {
      navigate(`/assets/${urlMatch[1]}`);
      return;
    }

    // 2. Check if decoded text is directly a 24-char Mongo ObjectId
    if (/^[a-f\d]{24}$/i.test(decodedText.trim())) {
      navigate(`/assets/${decodedText.trim()}`);
      return;
    }

    // 3. Fallback: Lookup by assetTag or search query
    lookupAndNavigate(decodedText.trim());
  };

  // Start scanning
  const startScanner = async () => {
    setErrorMessage('');
    setStarting(true);

    try {
      // Ensure previous instance is stopped
      await stopScanner();

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      const cameraIdOrConfig = selectedCamera
        ? selectedCamera
        : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraIdOrConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleDecodedText(decodedText);
        },
        (error) => {
          // Frame-by-frame parse failure is expected while scanning
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      const isHttps =
        window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (!isHttps) {
        setErrorMessage(
          'Camera access requires a secure context (HTTPS or localhost). Please access the application via localhost or enable SSL.'
        );
      } else if (
        err.name === 'NotAllowedError' ||
        err.message?.includes('Permission')
      ) {
        setErrorMessage(
          'Camera permission was denied. Please grant camera access in your browser settings to scan asset QR tags.'
        );
      } else {
        setErrorMessage(
          err.message || 'Unable to start camera video stream. Please check your webcam connection.'
        );
      }
      setIsScanning(false);
    } finally {
      setStarting(false);
    }
  };

  // Lookup asset by tag or text input
  const lookupAndNavigate = async (queryText) => {
    if (!queryText || !queryText.trim()) {
      toast.error('Please enter an asset tag or name');
      return;
    }

    try {
      setSearching(true);
      const trimmed = queryText.trim();

      // Check if user entered /assets/:id URL
      const urlMatch = trimmed.match(/\/assets\/([a-f\d]{24})/i);
      if (urlMatch && urlMatch[1]) {
        navigate(`/assets/${urlMatch[1]}`);
        return;
      }

      // Check direct 24-char ObjectId
      if (/^[a-f\d]{24}$/i.test(trimmed)) {
        navigate(`/assets/${trimmed}`);
        return;
      }

      // Search backend for assetTag match or name
      const res = await api.get('/assets', {
        params: { search: trimmed, limit: 5 }
      });

      if (res.data?.success) {
        const results = Array.isArray(res.data.data)
          ? res.data.data
          : res.data.data?.assets || [];

        if (results.length === 0) {
          toast.error(`No asset found matching '${trimmed}'`);
        } else {
          // Prioritize exact tag match
          const exactTag = results.find(
            (a) => a.assetTag?.toLowerCase() === trimmed.toLowerCase()
          );
          const target = exactTag || results[0];
          toast.success(`Found ${target.assetTag}: ${target.name}`);
          navigate(`/assets/${target._id}`);
        }
      }
    } catch (err) {
      console.error('Lookup error:', err);
      toast.error('Failed to lookup asset');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16">
      <PageHeader
        title="Asset QR Code Scanner"
        subtitle="Quickly inspect equipment tags in the field using your device camera or manual tag search."
      />

      {/* 1. CAMERA SCANNER CARD */}
      <Card
        title="Live Camera Scanner"
        subtitle="Point your camera at an official asset QR tag to automatically open its inspection records"
      >
        <div className="space-y-4">
          {/* Camera Selection & Toggle Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {cameras.length > 1 && (
              <div className="flex-1 max-w-xs">
                <Select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  disabled={isScanning}
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Camera ${c.id.slice(0, 8)}...`}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {!isScanning ? (
                <Button
                  variant="primary"
                  icon={Camera}
                  loading={starting}
                  onClick={startScanner}
                >
                  Start Camera Scanner
                </Button>
              ) : (
                <Button
                  variant="danger"
                  icon={CameraOff}
                  onClick={stopScanner}
                >
                  Stop Camera
                </Button>
              )}
            </div>
          </div>

          {/* Camera Permission / Error Warning Alert */}
          {errorMessage && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Camera Notice</span>
              </div>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* QR Video Viewport Area */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 min-h-[300px] flex items-center justify-center">
            {/* Html5Qrcode target div */}
            <div
              id={scannerContainerId}
              className="w-full h-full min-h-[300px]"
            />

            {/* Inactive Camera Overlay */}
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center bg-slate-900/90 backdrop-blur-2xs z-10 pointer-events-none">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-primary-400 mb-3 shadow-md">
                  <QrCode className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">Camera is Inactive</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Click 'Start Camera Scanner' to begin real-time optical barcode detection.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 2. MANUAL TAG / URL LOOKUP FALLBACK */}
      <Card
        title="Manual Tag or URL Lookup"
        subtitle="Cannot access the camera? Enter an asset tag (e.g. AST-0001) or paste an asset URL directly"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookupAndNavigate(manualInput);
          }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="flex-1 w-full">
              <Input
                placeholder="e.g. AST-0007 or paste http://.../assets/..."
                icon={Search}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              icon={ArrowRight}
              iconPosition="right"
              loading={searching}
              className="w-full sm:w-auto"
            >
              Lookup Asset
            </Button>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px] pt-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Supported formats: AST-xxxx asset tags, 24-character IDs, or direct inventory URLs.</span>
          </div>
        </form>
      </Card>
    </div>
  );
}
