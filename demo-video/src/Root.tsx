import { Composition } from "remotion";
import { IntakeLLGDemo } from "./IntakeLLGDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="IntakeLLGDemo"
      component={IntakeLLGDemo}
      durationInFrames={30 * 45}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
