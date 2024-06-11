"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type CallbackFunction = () => void;
type CapturingFunction = (isCapturing: boolean) => void;

const setIntervalX = (
  callback: CallbackFunction,
  capturing: CapturingFunction,
  delay: number,
  repetitions: number
): void => {
  let x = 0;
  const intervalID = window.setInterval(() => {
    callback();
    capturing(true);

    if (++x === repetitions) {
      window.clearInterval(intervalID);
      capturing(false);
    }
  }, delay);
};

const SHADOW = (
  data: string[],
  offsetMultiplier: number,
  displaced: number,
  blurred: number,
  divider: number
): string[] => {
  const isZero = (n: number): string =>
    n === 0 ? n.toString().replace("0px", "0") : `${n}Q`;
  return data.map((c, i) => {
    const x = Math.round(offsetMultiplier * (i % divider));
    const y = Math.round(offsetMultiplier * Math.floor(i / divider));

    // first box shadow overlaps with div, so is inset & width being the spread
    if (i === 0) {
      return `inset ${isZero(x + displaced)} ${isZero(
        y + displaced
      )} 0 ${isZero(Math.round(offsetMultiplier))} ${c}`;
    }

    return ` ${isZero(x + displaced)} ${isZero(y + displaced)} ${
      blurred ? blurred + "Q" : 0
    } ${c}`;
  });
};

const totalFrames = 100;
const animationDuration = 10; // in seconds
const keyframes = Array.from({ length: totalFrames }, (_, i) => {
  const percentage = Math.floor((i / totalFrames) * 100);
  return `${percentage}% {box-shadow: var(--bxs-frame-${i})}`;
}).join("\n");

const renderGeneratedCSS = (
  variables: string[],
  size: number,
  pixelSize: number
): string => `
:root {
  --size: ${pixelSize}px;
  --offset: 0px;
  ${variables.map((variable) => `${variable}`).join("")}
}
div.bxs-video-container {
  width: 200px;
  height: 200px;
  overflow: hidden;
}
div.bxs-video {
  width: 200px;
  height: 200px;
  animation: anim-shadow ${animationDuration}s steps(${totalFrames}, end) infinite;
  box-shadow: var(--bxs-frame-0);
  will-change: box-shadow;
}
@keyframes anim-shadow {
  ${keyframes}
}
`;

const qualitySettings = [
  { size: 200, divider: 20, pixelSize: 10 },
  { size: 200, divider: 23, pixelSize: 9 },
  { size: 200, divider: 25, pixelSize: 8 },
  { size: 200, divider: 29, pixelSize: 7 },
  { size: 200, divider: 34, pixelSize: 6 },
  { size: 200, divider: 40, pixelSize: 5 },
  { size: 200, divider: 50, pixelSize: 4 },
  { size: 200, divider: 67, pixelSize: 3 },
  { size: 200, divider: 100, pixelSize: 2 },
  { size: 200, divider: 200, pixelSize: 1 },
];

export default function Home() {
  const [size, setSize] = useState<number>(200); // HD 200
  const [divider, setDivider] = useState<number>(34); // HD 200
  const [pixelSize, setPixelSize] = useState<number>(6); // HD 1

  const [lessColors, setLessColors] = useState<boolean>(false);

  const [data, setData] = useState<string[]>([]);
  const [capture, setCapture] = useState<boolean>(false);
  const [replay, setReplay] = useState<boolean>(false);
  const [capturing, setCapturing] = useState<boolean>(false);
  const [generateCSS, setGenerateCSS] = useState<boolean>(false);
  const [CSSVariables, setCSSVariables] = useState<any>(null);
  const [finalCSS, setFinalCSS] = useState<string>("");
  const [replayMessage, setReplayMessage] = useState<boolean>(true);
  const [codepenData, setCodepenData] = useState<any>("");
  const [displacedPixels, setDisplacedPixels] = useState<number>(0);
  const [blurredPixel, setBlurredPixel] = useState<number>(0);

  const [matrixArr, setMatrixArr] = useState<any>([]);
  const [play, setPlay] = useState<boolean>(false);
  const [webcamOn, setWebcamOn] = useState<boolean>(false);

  const [countdown, setCountdown] = useState<number>(10);

  const [rerender, setRerender] = useState(false);

  const fillerRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cssCodeRef = useRef<HTMLElement>(null);

  const exportHTML = `&lt;div class="bxs-video-container">&lt;div class="bxs-video" />&lt;/div>`;

  // Function to set quality
  const setQuality = (quality: {
    size: number;
    divider: number;
    pixelSize: number;
  }) => {
    setSize(quality.size);
    setDivider(quality.divider);
    setPixelSize(quality.pixelSize);
  };

  // Debounced function to avoid excessive rerenders
  const updateShadow = useCallback(() => {
    if (fillerRef.current && size && divider) {
      const offsetMultiplier = size / divider;
      fillerRef.current.style.boxShadow = `${
        data &&
        SHADOW(data, offsetMultiplier, displacedPixels, blurredPixel, divider)
      }`;
    }
  }, [data, size, divider, displacedPixels]);

  useEffect(() => {
    updateShadow();
  }, [updateShadow]);

  // Live preview of the webcam
  useEffect(() => {
    if (fillerRef.current && size && divider) {
      const offsetMultiplier = size / divider;

      fillerRef.current.style.boxShadow = `${
        data &&
        SHADOW(data, offsetMultiplier, displacedPixels, blurredPixel, divider)
      }`;
    }
  }, [fillerRef, data, size, divider, displacedPixels]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const video = document.querySelector("video") as HTMLVideoElement;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    canvas.width = size;
    canvas.height = size;
    let matrix = [];

    const pixelate = (
      sample_size: number,
      _ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      record: boolean,
      scaleDown: boolean
    ) => {
      var context = _ctx;
      const currentFrame = [];
      const currentMatrix = [];

      var sourceBuffer32 = new Uint32Array(
        context.getImageData(0, 0, w, h).data.buffer
      );
      context.clearRect(0, 0, w, h);

      for (var y = 0; y < h; y += sample_size) {
        for (var x = 0; x < w; x += sample_size) {
          var pos = x + y * w;
          var b = (sourceBuffer32[pos] >> 16) & 0xff;
          var g = (sourceBuffer32[pos] >> 8) & 0xff;
          var r = (sourceBuffer32[pos] >> 0) & 0xff;
          context.fillStyle = `rgb(${r},${g},${b})`;

          if (scaleDown) {
            const toHex = (num) => num.toString(16);

            // Scaling down r, g, b values from 0-255 to 0-15
            const scaleDown = (num) => Math.round(num / 17);

            // Converting to single hex digit and combining them
            const hexCode3 = `#${toHex(scaleDown(r))}${toHex(
              scaleDown(g)
            )}${toHex(scaleDown(b))}`;

            const pixelData = hexCode3;

            record
              ? currentFrame.push(pixelData)
              : currentMatrix.push(pixelData);
            context.fillRect(x, y, sample_size + 1, sample_size + 1);
          } else {
            const toHex = (num) => num.toString(16).padStart(2, "0");

            const hexCode = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

            const pixelData = hexCode;

            record
              ? currentFrame.push(pixelData)
              : currentMatrix.push(pixelData);

            context.fillRect(x, y, sample_size + 1, sample_size + 1);
          }
        }
      }

      if (record) {
        matrix.push(currentFrame);
        setMatrixArr([...matrixArr, ...matrix]);
      } else {
        setData(currentMatrix);
      }
    };

    const itv = () =>
      setInterval(() => {
        anim(false);
      }, 1);

    const anim = (record: boolean) =>
      requestAnimationFrame(() => {
        canvas.width = size;
        canvas.height = size;
        canvas.getContext("2d")?.drawImage(video, 0, 0, size, size);

        if (canvas.width > 0) {
          pixelate(
            pixelSize,
            ctx,
            canvas.width,
            canvas.height,
            record,
            lessColors
          );
        }
      });

    if (capture) {
      let i = 0;

      setIntervalX(
        () => {
          i++;
          anim(true); // true for record,
        },
        setCapturing,
        totalFrames,
        totalFrames
      );

      // 250 is the delay between each frame
      // 30 is the number of frames
      // total time = 250 * 30 = 7500ms = 7.5s
      // If I want a 10s video and a frame every 100ms I need 100 frames
    } else {
      itv();
    }

    const constraints = {
      audio: false,
      video: { facingMode: "user" },
    };

    function handleSuccess(stream: MediaStream) {
      (window as any).stream = stream; // make stream available to browser console

      const video = document.querySelector("video") as HTMLVideoElement;

      if (webcamOn) {
        video.srcObject = stream;
      } else {
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
    }

    function handleError(error: Error) {
      console.log(
        "navigator.MediaDevices.getUserMedia error: ",
        error.message,
        error.name
      );
    }

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(handleSuccess)
      .catch(handleError);

    () => window.clearInterval(itv());

    return () => window.clearInterval(itv());
  }, [capture, webcamOn, size, pixelSize, divider, lessColors]);

  // Replay the video
  useEffect(() => {
    if (previewRef.current && matrixArr.length > 0) {
      const offsetMultiplier = size / divider;
      setReplay(true);
      let i = 0;
      setIntervalX(
        () => {
          i++;
          previewRef.current!.style.boxShadow = `${SHADOW(
            matrixArr[i - 1],
            offsetMultiplier,
            displacedPixels,
            blurredPixel,
            divider
          )}`;
        },
        setReplay,
        100,
        matrixArr.length
      );
    }
  }, [play]);

  //  Set the css variables ( activated when button is clicked )
  useEffect(() => {
    const vars: string[] = [];
    matrixArr.map((colorArr: string[], index: number) => {
      const offsetMultiplier = size / divider;

      vars.push(
        `--bxs-frame-${index}: ${SHADOW(
          colorArr,
          offsetMultiplier,
          displacedPixels,
          blurredPixel,
          divider
        )};`
      );

      setCSSVariables(vars);
    });
  }, [generateCSS]);

  // Once the CSSVariables state is filled, fill in the code
  useEffect(() => {
    if (cssCodeRef.current && CSSVariables) {
      const css = renderGeneratedCSS(CSSVariables, size, pixelSize);
      cssCodeRef.current.innerHTML = css;
      setFinalCSS(css);
    }
  }, [CSSVariables]);

  useEffect(() => {
    var data = {
      title: "Video made with box-shadows",
      html: exportHTML,
      html_pre_processor: "none",
      css: finalCSS,
      css_pre_processor: "none",
      css_starter: "neither",
      css_prefix_free: false,
      js: `
// Create videos with CSS box-shadows
// Credits: Lucas Bonomi <@LukyVj>`,
      js_pre_processor: "none",
      js_modernizr: false,
      js_library: "",
      html_classes: "",
      css_external: "",
      js_external: "",
      template: false,
    };

    setCodepenData(
      JSON.stringify(data).replace(/"/g, "&quot;").replace(/'/g, "&apos;")
    );
  }, [finalCSS]);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;

    if (capture) {
      setCapturing(true);
      setCountdown(10); // Reset the countdown

      countdownInterval = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown === 0) {
            clearInterval(countdownInterval);
            setCapturing(false);
            setCapture(false);
            return 0;
          }
          return prevCountdown - 1;
        });
      }, 1000);
    }

    return () => clearInterval(countdownInterval);
  }, [capture]);

  useEffect(() => {
    setRerender(false);

    setTimeout(() => {
      setRerender(true);
    }, 10);
  }, [pixelSize, divider]);

  /** Bear with me on this one */
  const saveDataToLocalStorage = (key, someData) => {
    localStorage[key] = JSON.stringify(someData);
  };

  const removeDataFromLocalStorage = (key) => {
    localStorage.removeItem(key);
  };

  return isClient ? (
    <main className="grid grid-cols-2 gap-4 h-screen">
      {/* VIDEO EXPERIMENT */}
      <div className="grid grid-cols-2 gap-4">
        <div className="h-[240px] border border-black grid justify-center items-center relative">
          <video playsInline autoPlay></video>
          <h4 className="self-end text-center bg-black p-1 text-white absolute w-full">
            Webcam / video tag
          </h4>
        </div>
        {rerender ? (
          <>
            <div className="h-[240px] border border-black grid justify-center items-center relative">
              <canvas ref={canvasRef}></canvas>
              <h4 className="self-end text-center bg-black p-1 text-white absolute w-full">
                Canvas
              </h4>
            </div>
            <div className="h-[240px] border border-black grid justify-start relative">
              {capturing ? (
                <div className="p-2 absolute bottom-0 flex w-full bg-black z-10 text-white items-center justify-center gap-4">
                  <p>Recording...</p>

                  <span className="w-5 h-5 bg-white rounded-full text-black font-bold text-center flex items-center justify-center record-animation">
                    <p className="text-xs ">{countdown}</p>
                  </span>
                </div>
              ) : null}
              <div
                className="filler absolute"
                ref={fillerRef}
                style={{
                  width: 200,
                  height: 200,
                  aspectRatio: "16/9",
                  left: `72px`,
                }}
              />
              <h4 className="absolute w-full self-end text-center bg-black p-1 text-white block">
                css
              </h4>
            </div>
            <div className="h-[240px] border border-black grid justify-start relative">
              <div
                className="preview"
                ref={previewRef}
                style={{
                  width: pixelSize,
                  height: pixelSize,
                  left: `72px`,
                }}
              />

              <h4 className="absolute w-full self-end text-center bg-black p-1 text-white block">
                Preview
              </h4>
            </div>
          </>
        ) : null}
      </div>
      {/* END VIDEO EXPERIMENT */}
      <div className="h-screen overflow-scroll">
        {/* Sidebar */}
        <div className="flex flex-col">
          <header>
            <h1 className="m-0">Video with Box-Shadow</h1>
          </header>
          <div>
            <span className="flex">
              <label>Less colors</label>{" "}
              <small>(from 6 to 3 digit hexadecimal)</small>
            </span>
            <input
              type="checkbox"
              checked={lessColors}
              onChange={(e) => setLessColors(e.target.checked)}
            />
          </div>
          <div className="quality-buttons">
            <label htmlFor="">Quality</label>
            <select
              onChange={(e) => setQuality(qualitySettings[e.target.value])}
            >
              {qualitySettings.map((quality, index) => (
                <option
                  key={index}
                  value={index}
                  selected={
                    quality.size === size &&
                    quality.divider === divider &&
                    quality.pixelSize === pixelSize
                  }
                >
                  Pixel size {quality.pixelSize}px
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>
              Pixel size ({pixelSize}px):
              <input
                type="range"
                min="1"
                max="16"
                value={pixelSize}
                onChange={(e) => setPixelSize(Number(e.target.value))}
              />
            </label>
          </div>
          <div>
            <label>
              Divider ({divider}):
              <input
                type="range"
                min="2"
                max="200"
                value={divider}
                onChange={(e) => setDivider(Number(e.target.value))}
              />
            </label>
          </div>
          <div>
            <label>
              Size ({size}px):
              <input
                type="range"
                min="8"
                max="1024"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
            </label>
          </div>
          <div>
            <label>
              Displaced pixels ({displacedPixels}px):
              <input
                type="range"
                min="0"
                max="100"
                value={displacedPixels}
                onChange={(e) => setDisplacedPixels(Number(e.target.value))}
              />
            </label>
          </div>
          <div>
            <label>
              Blurred pixels ({blurredPixel}px):
              <input
                type="range"
                min="0"
                max="100"
                value={blurredPixel}
                onChange={(e) => setBlurredPixel(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <header className="bdw-0 bdtw-2 bdc-theme bds-solid  color-theme">
              <h3>Webcam</h3>
            </header>

            <div className="grid grid-cols-3 gap-2 pv-16 px-2 py-1">
              <button
                onClick={() => {
                  setWebcamOn(true);
                  setCapture(false);
                }}
                className="d-flex ai-center jc-center"
              >
                (1) On
              </button>
              <button
                onClick={() => {
                  setWebcamOn(false);
                  setCapture(false);
                }}
                className="bg-red-500 d-flex ai-center jc-center disabled:opacity-50"
                disabled={!webcamOn}
              >
                Off
              </button>

              <button
                onClick={() => setCapture(true)}
                className="d-flex ai-center jc-center color-white disabled:opacity-50"
                disabled={!webcamOn}
              >
                (2) Record
              </button>
            </div>

            {capturing ? (
              <div className="p-2">
                <p>Recording...</p>

                <p>{countdown}</p>
              </div>
            ) : null}
            {/* Show count from x to 0 */}
          </div>
          <div className="grid grid-cols-2 gap-2 px-2 py-1">
            <button
              onClick={() => {
                setPlay(!play);
                setReplayMessage(false);
                setWebcamOn(false);
              }}
              disabled={matrixArr.length === 0}
              className="d-flex ai-center jc-center disabled:opacity-50"
            >
              (3) Replay
            </button>

            <button
              onClick={() => setGenerateCSS(true)}
              disabled={matrixArr.length === 0}
              className="d-flex ai-center jc-center disabled:opacity-50"
            >
              (4) Generate CSS
            </button>
          </div>

          <div className="p-2 grid grid-cols-2 gap-2">
            <form
              action="https://codepen.io/pen/define"
              method="POST"
              target="_blank"
            >
              <input
                type="hidden"
                name="data"
                value={codepenData ? codepenData : ""}
              />

              <button
                type="submit"
                className="app-none p-2 bdw-0 bg-green-500 w-full disabled:opacity-50"
                disabled={finalCSS === ""}
              >
                (5) Export to Codepen
              </button>
            </form>
            <button
              disabled={finalCSS === ""}
              className="disabled:opacity-50"
              onClick={() => {
                var popup = window.open("blankPage.html");
                var html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Document</title><style>${finalCSS}</style></head><body><div class="bxs-video-container"><div class="bxs-video" /></div></body></html>`;

                popup?.document.write(html);
              }}
            >
              (5) Open in new tab
            </button>

            <Link
              className={`bg-blue-500 text-white font-bold py-2 px-4 rounded ${
                finalCSS === "" ? "opacity-50" : ""
              }`}
              href={{
                pathname: "/render",
              }}
              target="_blank"
              onClick={() => {
                removeDataFromLocalStorage("css");
                saveDataToLocalStorage("css", finalCSS);
              }}
            >
              Send data in the /render page
            </Link>
          </div>
          <div className="overflow-scroll h-[50%]">
            <header className="bdw-0 bdtw-2 bdc-theme bds-solid  color-theme">
              <h3>Check the code</h3>
            </header>
            <p>HTML:</p>
            <pre className="p-2 bg-white">
              <code dangerouslySetInnerHTML={{ __html: exportHTML }} />
            </pre>
            <p>CSS:</p>
            <div className="Code">
              <pre className="p-2 bg-white">
                <code className="language-css" ref={cssCodeRef}>
                  // Click{" "}
                  <span className="bg-blue-500 text-white font-bold py-1 px-2 rounded">
                    Generate CSS
                  </span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  ) : null;
}
