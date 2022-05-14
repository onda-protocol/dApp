export function FontFace() {
  return (
    <style jsx global>
      {`
        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 100;
          font-display: block;
          src: url(/fonts/Inter-Thin.ttf) format("truetype");
        }

        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 200;
          font-display: block;
          src: url(/fonts/Inter-ExtraLight.ttf) format("truetype");
        }

        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 300;
          font-display: block;
          src: url(/fonts/Inter-Light.ttf) format("truetype");
        }

        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 400;
          font-display: block;
          src: url(/fonts/Inter-Regular.ttf) format("truetype");
        }

        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 500;
          font-display: block;
          src: url(/fonts/Inter-Medium.ttf) format("truetype");
        }

        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 600;
          font-display: block;
          src: url(/fonts/Inter-SemiBold.ttf) format("truetype");
        }

        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 700;
          font-display: block;
          src: url(/fonts/Inter-Bold.ttf) format("truetype");
        }

        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 800;
          font-display: block;
          src: url(/fonts/Inter-ExtraBold.ttf) format("truetype");
        }

        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 900;
          font-display: block;
          src: url(/fonts/Inter-Black.ttf) format("truetype");
        }
      `}
    </style>
  );
}
