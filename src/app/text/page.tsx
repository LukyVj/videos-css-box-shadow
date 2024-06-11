"use client";

import { useEffect, useRef, useState } from "react";
import "./style.css";

export default function TextPage() {
  const textAreaRef = useRef<null | HTMLTextAreaElement>(null);
  const [extraStyles, setExtraStyles] = useState("");

  useEffect(() => {
    if (!textAreaRef.current) return;

    textAreaRef.current.oninput = (e) => {
      setExtraStyles(textAreaRef.current!.value);
    };
  }, []);

  return (
    <>
      <style>{extraStyles}</style>
      <div className="grid grid-cols-2 h-screen">
        <div className="bxs-video-container">
          <div className="bxs-video" contentEditable>
            Hello
          </div>
        </div>

        <textarea ref={textAreaRef} className="w-full p-2">
          {`/* Override some css */
div.bxs-video-container {
  
}
div.bxs-video {

}`}
        </textarea>
      </div>
    </>
  );
}
