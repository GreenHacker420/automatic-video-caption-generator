import "./index.css";
import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { Logo } from "./HelloWorld/Logo";
import { CaptionedVideo } from "./CaptionedVideo";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot = () => {
  // Try to get duration from localStorage, fallback to default
  const getDuration = () => {
    try {
      const storedDuration = localStorage.getItem('remotionDuration');
      return storedDuration ? parseInt(storedDuration, 10) : 540;
    } catch {
      return 540; // 18 seconds at 30fps - matches demo captions
    }
  };

  return (
    <>
      {/* Main Captioned Video Composition for rendering */}
      <Composition
        id="CaptionedVideo"
        component={CaptionedVideo}
        durationInFrames={getDuration()}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          videoSrc: "",
          captions: [],
          preset: {
            name: 'Bottom Centered',
            position: 'bottom',
            style: 'bottom-centered'
          }
        }}
      />

      {/* Original HelloWorld compositions */}
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          titleText: "Welcome to Remotion",
          titleColor: "black",
        }}
      />
      
      <Composition
        id="OnlyLogo"
        component={Logo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
