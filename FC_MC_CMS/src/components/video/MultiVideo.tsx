import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
// @ts-ignore
// eslint-disable-next-line import/no-webpack-loader-syntax,import/order
import videojs from '!video.js';
import 'video.js/dist/video-js.css';

function playWithSrc(playerRef: any, url: string) {
  const player: any = playerRef.current;
  player.autoplay(true);
  player.src({
    src: url,
  });
}

function initVideo(videoRef: any, playerRef: any) {
  const videoElement = document.createElement('video-js');

  videoElement.classList.add('vjs-big-play-centered');
  videoRef.current.appendChild(videoElement);

  // eslint-disable-next-line no-param-reassign
  playerRef.current = videojs(videoElement, {
    autoplay: true,
    controls: true,
    responsive: true,
    fluid: true,
    muted: true,
  });
  playerRef.current.on('error', () => {
    toast.error('Error while loading video');
  });
}

interface DRMVideoProps {
  url: string;
}

export default function MultiVideo({
  url,
}: DRMVideoProps) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [errorState, setErrorState] = useState<string>('');

  useEffect(() => {
    try {
      if (!playerRef.current) {
        initVideo(videoRef, playerRef);
        playWithSrc(playerRef, url);
      } else {
        playWithSrc(playerRef, url);
      }
    } catch (error: any) {
      setErrorState(error?.message || 'Error while loading video');
    }

    return () => {
      // @ts-ignore
      if (playerRef.current) {
        if ('current' in playerRef && 'dispose' in playerRef.current) {
          // @ts-ignore
          playerRef.current.dispose();
          playerRef.current = null;
        }
      }
    };
  }, [videoRef]);

  if (errorState) {
    return (
      <div className="w-full">
        <p>Error : </p>
        <p className="text-red whitespace-normal break-all text-sm">{errorState}</p>
      </div>
    );
  }

  return (
    <div className="w-full" data-vjs-player>
      <div ref={videoRef} />
    </div>
  );
}
