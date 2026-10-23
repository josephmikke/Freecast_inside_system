import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
// eslint-disable-next-line import/extensions
import shaka from 'shaka-player/dist/shaka-player.ui.js';
import 'shaka-player/dist/controls.css';

interface HLSVideoProps {
  url: string;
}

export default function HLSVideo({ url }: HLSVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [errorState, setErrorState] = useState<string>('');

  useEffect(() => {
    // Check if the browser supports Shaka Player
    if (!shaka.Player.isBrowserSupported()) {
      setErrorState('Browser not supported');
      return undefined;
    }

    const initPlayer = async () => {
      if (videoRef.current && containerRef.current) {
        try {
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
  }, [url]);

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
