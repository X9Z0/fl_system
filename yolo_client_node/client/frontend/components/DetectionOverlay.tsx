interface Detection {
  label: string;
  conf: number;
  bbox: number[];
}

interface DetectionOverlayProps {
  detections: Detection[];
  videoWidth: number;
  videoHeight: number;
}

export default function DetectionOverlay({
  detections,
  videoWidth,
  videoHeight,
}: DetectionOverlayProps) {
  if (!detections || detections.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map((detection, index) => {
        const [x1, y1, x2, y2] = detection.bbox;

        // Calculate position as percentage for responsive overlay
        const left = `${(x1 / videoWidth) * 100}%`;
        const top = `${(y1 / videoHeight) * 100}%`;
        const width = `${((x2 - x1) / videoWidth) * 100}%`;
        const height = `${((y2 - y1) / videoHeight) * 100}%`;

        return (
          <div
            key={index}
            className="detection-box"
            style={{
              left,
              top,
              width,
              height,
            }}
          >
            <div className="detection-label">
              {detection.label} {(detection.conf * 100).toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
