import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
// eslint-disable-next-line import/extensions
import shaka from 'shaka-player/dist/shaka-player.ui.js';
import 'shaka-player/dist/controls.css';
import { useLicence } from '@api/drm/licenses';
import detectBrowser from '@utils/getBrowser';

interface DRMHLSVideoProps {
  url: string;
}

export default function DRMHLSVideo({ url }: DRMHLSVideoProps) {
  const { data: licenseData, isFetching } = useLicence();
  const browser = detectBrowser();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [errorState, setErrorState] = useState<string>('');

  useEffect(() => {
    // Only run on Safari with license data
    if (browser !== 'Safari' || !licenseData || isFetching) {
      return undefined;
    }

    // Check if the browser supports Shaka Player
    if (!shaka.Player.isBrowserSupported()) {
      setErrorState('Browser not supported');
      return undefined;
    }

    const initPlayer = async () => {
      if (videoRef.current && containerRef.current && licenseData && !isFetching) {
        try {
          // Install polyfills
          shaka.polyfill.installAll();

          // Create Shaka Player instance
          const player = new shaka.Player();
          await player.attach(videoRef.current);
          playerRef.current = player;

          // Create UI
          const ui = new shaka.ui.Overlay(
            player,
            containerRef.current,
            videoRef.current,
          );

          // Configure UI
          const config = {
            addSeekBar: true,
            addBigPlayButton: true,
            controlPanelElements: [
              'play_pause',
              'time_and_duration',
              'spacer',
              'mute',
              'volume',
              'fullscreen',
              'overflow_menu',
            ],
            overflowMenuButtons: ['captions', 'quality', 'playback_rate'],
          };
          ui.configure(config);

          // Configure FairPlay DRM
          player.configure({
            drm: {
              preferredKeySystems: ['com.apple.fps'],
              servers: {
                'com.apple.fps': licenseData?.data?.fairplayLaUrl || '',
              },
              advanced: {
                'com.apple.fps': {
                  serverCertificateUri: licenseData?.data?.fairplayPubCertUrl || '',
                },
              },
            },
          });

          // Register request filter for FairPlay license requests
          player.getNetworkingEngine()?.registerRequestFilter((type: any, request: any) => {
            if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
              // Convert request body to base64 for FairPlay
              const originalPayload = new Uint8Array(request.body);
              const base64Payload = shaka.util.Uint8ArrayUtils.toStandardBase64(originalPayload);
              const contentId = shaka.util.FairPlayUtils.defaultGetContentId(request.initData);
              const params = `spc=${base64Payload}&assetId=${contentId}`;

              // Set headers and body for FairPlay license request
              request.headers['Content-Type'] = 'application/x-www-form-urlencoded';
              if (licenseData?.data?.headerName && licenseData?.data?.base64) {
                request.headers[licenseData.data.headerName] = licenseData.data.base64;
              }
              request.body = shaka.util.StringUtils.toUTF8(params);
            }
          });

          // Register response filter for FairPlay license responses
          player.getNetworkingEngine()?.registerResponseFilter((type: any, response: any) => {
            if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
              let responseText = shaka.util.StringUtils.fromUTF8(response.data);
              responseText = responseText.trim();

              // Remove XML wrapper if present
              if (responseText.substr(0, 5) === '<ckc>' && responseText.substr(-6) === '</ckc>') {
                responseText = responseText.slice(5, -6);
              }

              // Convert base64 response to ArrayBuffer
              response.data = shaka.util.Uint8ArrayUtils.fromBase64(responseText).buffer;
            }
          });

          // Error handling
          player.addEventListener('error', (event: any) => {
            const error = event.detail;
            toast.error('Error while loading video');
            setErrorState(error.message || 'Error loading video');
          });

          // Load the manifest
          await player.load(url);

          // Enable first text track by default if available
          const tracks = player.getTextTracks();
          if (tracks && tracks.length > 0) {
            player.setTextTrackVisibility(true);
          }
        } catch (error: any) {
          toast.error('Error while loading video');
          setErrorState(error.message || 'Error loading video');
        }
      }
    };

    initPlayer();

    // Cleanup function
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [url, licenseData, isFetching, browser]);

  if (browser !== 'Safari') {
    return (
      <div className="w-96">
        <h1>Error</h1>
        <h3 className="text-red">The HLS FairPlay format is only readable on the Safari browser.</h3>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="w-96">
        <p>Error : </p>
        <p className="text-red whitespace-normal break-all text-sm">{errorState}</p>
      </div>
    );
  }

  return (
    <div className="w-[900px]">
      <div ref={containerRef} data-shaka-player-container>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          className="w-full"
          autoPlay
          data-shaka-player
        />
      </div>
    </div>
  );
}
