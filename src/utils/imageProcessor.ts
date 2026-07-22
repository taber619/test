export interface OptimizationOptions {
  compressionMode: "original" | "webp-high" | "webp-medium" | "webp-low";
  stripMetadata: boolean;
  addWatermark?: boolean;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkColor?: string;
  watermarkSize?: number;
  watermarkPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
}

/**
 * Processes a video file client-side to overlay watermark onto video frames using HTML5 Canvas & MediaRecorder
 */
export async function processVideo(file: File, options: OptimizationOptions): Promise<File> {
  if (!options.addWatermark || !options.watermarkText) {
    return file;
  }

  // Ensure MediaRecorder and canvas captureStream are available
  if (
    typeof window === "undefined" ||
    !window.MediaRecorder ||
    !(HTMLCanvasElement.prototype as any).captureStream
  ) {
    return file;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (f: File) => {
      if (!resolved) {
        resolved = true;
        resolve(f);
      }
    };

    // Timeout safety: if video processing takes longer than 15s, fallback to original file
    const timeoutId = setTimeout(() => {
      safeResolve(file);
    }, 15000);

    try {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      video.onloadedmetadata = () => {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(objectUrl);
          safeResolve(file);
          return;
        }

        // Capture canvas stream at 30fps
        const stream = (canvas as any).captureStream(30);

        let mimeType = "video/mp4";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm;codecs=vp9";
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm";
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "";
        }

        let mediaRecorder: MediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        } catch (e) {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(objectUrl);
          safeResolve(file);
          return;
        }

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(objectUrl);
          if (chunks.length === 0) {
            safeResolve(file);
            return;
          }
          const finalMime = mimeType || "video/webm";
          const blob = new Blob(chunks, { type: finalMime });
          const extension = finalMime.includes("mp4") ? ".mp4" : ".webm";
          const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
          const newName = `${baseName}_watermarked${extension}`;

          const processedFile = new File([blob], newName, {
            type: finalMime,
            lastModified: Date.now(),
          });
          safeResolve(processedFile);
        };

        let animFrameId: number;

        const drawFrame = () => {
          if (video.paused || video.ended) return;

          ctx.drawImage(video, 0, 0, width, height);

          // Render Watermark
          ctx.save();
          const scaleFactor = options.watermarkSize || 0.04;
          const fontSize = Math.max(14, Math.round(width * scaleFactor));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.globalAlpha = options.watermarkOpacity !== undefined ? options.watermarkOpacity : 0.5;
          ctx.fillStyle = options.watermarkColor || "#ffffff";
          ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          const text = options.watermarkText || "";
          const textMetrics = ctx.measureText(text);
          const textWidth = textMetrics.width;

          let x = width - textWidth - 20;
          let y = height - 20;

          const pos = options.watermarkPosition || "bottom-right";
          if (pos === "bottom-left") {
            x = 20;
            y = height - 20;
          } else if (pos === "top-right") {
            x = width - textWidth - 20;
            y = fontSize + 20;
          } else if (pos === "top-left") {
            x = 20;
            y = fontSize + 20;
          } else if (pos === "center") {
            x = (width - textWidth) / 2;
            y = height / 2 + fontSize / 4;
          }

          ctx.fillText(text, x, y);
          ctx.restore();

          animFrameId = requestAnimationFrame(drawFrame);
        };

        video.onplay = () => {
          try {
            mediaRecorder.start();
            drawFrame();
          } catch (e) {
            clearTimeout(timeoutId);
            URL.revokeObjectURL(objectUrl);
            safeResolve(file);
          }
        };

        video.onended = () => {
          cancelAnimationFrame(animFrameId);
          if (mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
          }
        };

        video.play().catch(() => {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(objectUrl);
          safeResolve(file);
        });
      };

      video.onerror = () => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(objectUrl);
        safeResolve(file);
      };
    } catch (e) {
      clearTimeout(timeoutId);
      safeResolve(file);
    }
  });
}

/**
 * Processes an image file client-side to strip EXIF metadata and/or compress/convert to WebP
 */
export async function processImage(file: File, options: OptimizationOptions): Promise<File> {
  // If original format is chosen, metadata stripping is disabled, and watermark is not requested, do nothing
  if (options.compressionMode === "original" && !options.stripMetadata && !options.addWatermark) {
    return file;
  }

  // Skip processing GIF files to avoid losing animations
  if (file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Ensure valid dimensions
      if (!width || !height) {
        resolve(file);
        return;
      }

      let maxDim = Infinity;
      let quality = 0.85;
      let format = "image/jpeg"; // Default high quality format if not WebP

      // Handle custom output format & quality based on selection
      if (options.compressionMode === "webp-high") {
        format = "image/webp";
        quality = 0.88;
        maxDim = 3840; // 4K max dimension
      } else if (options.compressionMode === "webp-medium") {
        format = "image/webp";
        quality = 0.75;
        maxDim = 2560; // 2K max dimension
      } else if (options.compressionMode === "webp-low") {
        format = "image/webp";
        quality = 0.60;
        maxDim = 1920; // HD max dimension
      } else if (options.compressionMode === "original") {
        // Redraw at original format if possible, fallback to jpeg if blank type
        format = file.type || "image/jpeg";
        quality = 0.95;
      }

      // Proportional resizing if size exceeds maximum allowed dimension
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image onto canvas. This action naturally discards any metadata (EXIF/GPS)
      ctx.drawImage(img, 0, 0, width, height);

      // Apply watermark if requested
      if (options.addWatermark && options.watermarkText) {
        ctx.save();
        
        // Font size scaled proportional to canvas width
        const scaleFactor = options.watermarkSize || 0.04;
        const fontSize = Math.max(14, Math.round(width * scaleFactor));
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        // Opacity
        ctx.globalAlpha = options.watermarkOpacity !== undefined ? options.watermarkOpacity : 0.4;
        
        // Color
        ctx.fillStyle = options.watermarkColor || "#ffffff";
        
        // Shadow for readability on different backgrounds
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        const text = options.watermarkText;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        
        let x = width - textWidth - 20;
        let y = height - 20;
        
        const pos = options.watermarkPosition || "bottom-right";
        if (pos === "bottom-left") {
          x = 20;
          y = height - 20;
        } else if (pos === "top-right") {
          x = width - textWidth - 20;
          y = fontSize + 20;
        } else if (pos === "top-left") {
          x = 20;
          y = fontSize + 20;
        } else if (pos === "center") {
          x = (width - textWidth) / 2;
          y = height / 2 + fontSize / 4;
        }
        
        ctx.fillText(text, x, y);
        ctx.restore();
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Adjust file extension if format changed to WebP
            let newName = file.name;
            if (format === "image/webp" && !file.name.toLowerCase().endsWith(".webp")) {
              const lastDot = file.name.lastIndexOf(".");
              const baseName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
              newName = `${baseName}.webp`;
            }

            const processedFile = new File([blob], newName, {
              type: format,
              lastModified: Date.now(),
            });
            resolve(processedFile);
          } else {
            resolve(file);
          }
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      resolve(file);
    };
  });
}
