/**
 * Merges a video file and an audio URL into a single video file using MediaRecorder.
 * Note: This requires playing the media in real-time or faster-than-real-time to capture it.
 * This is a client-side solution to avoid backend processing.
 */
export const exportMergedVideo = async (
    videoUrl: string,
    audioUrl: string
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      const audioElement = document.createElement('audio');
  
      videoElement.src = videoUrl;
      videoElement.muted = true; // Mute original video
      videoElement.crossOrigin = "anonymous";
      
      audioElement.src = audioUrl;
      audioElement.crossOrigin = "anonymous";
  
      let stream: MediaStream;
      
      // Wait for metadata to ensure we have durations
      videoElement.onloadedmetadata = () => {
        try {
          // Create streams
          // @ts-ignore - captureStream exists in most modern browsers
          const videoStream = videoElement.captureStream ? videoElement.captureStream() : videoElement.mozCaptureStream();
          
          const audioContext = new AudioContext();
          const audioSource = audioContext.createMediaElementSource(audioElement);
          const audioDestination = audioContext.createMediaStreamDestination();
          audioSource.connect(audioDestination);
          
          const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioDestination.stream.getAudioTracks()
          ]);
  
          const recorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp9'
          });
  
          const chunks: BlobPart[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
  
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            resolve(blob);
            // Cleanup
            audioContext.close();
            videoElement.remove();
            audioElement.remove();
          };
  
          // Start recording and playing
          recorder.start();
          videoElement.play();
          audioElement.play();
  
          // Stop when audio ends (assuming audio drives the dub duration) or video ends
          audioElement.onended = () => {
            if (recorder.state !== 'inactive') recorder.stop();
          };
          
          videoElement.onended = () => {
             // If video ends before audio, loop video? Or just stop. 
             // For now, let's stop to be safe.
             if (recorder.state !== 'inactive') recorder.stop();
          }
  
        } catch (e) {
          reject(e);
        }
      };
  
      videoElement.onerror = (e) => reject(new Error("Video load error"));
      audioElement.onerror = (e) => reject(new Error("Audio load error"));
    });
  };
