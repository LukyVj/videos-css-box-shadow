"use client";

import React, { useEffect, useRef, useState } from "react";

export default function Render() {
  const textAreaRef = useRef<null | HTMLTextAreaElement>(null);
  // read data from localstorage
  const [localData, setLocalData] = useState<{ html: string; css: string }>({
    html: "",
    css: "",
  });

  const [extraStyles, setExtraStyles] = useState("");

  useEffect(() => {
    // The issue here is that both html and css contains \n, I need to decode it

    setLocalData({
      html: JSON.parse(localStorage.getItem("html")!),
      css: JSON.parse(localStorage.getItem("css")!),
    });

    console.log(localData);
  }, []);

  useEffect(() => {
    if (!textAreaRef.current) return;

    textAreaRef.current.oninput = (e) => {
      setExtraStyles(textAreaRef.current!.value);
    };
  }, []);

  return (
    <div>
      <h1>Render</h1>

      <div id="app" className="w-full grid grid-cols-2">
        <style>
          {localData.css}
          {extraStyles}
        </style>
        <div className="bxs-video-container">
          <div className="bxs-video" />
        </div>

        <textarea ref={textAreaRef} className="w-full p-2">
          {`/* Override some css */
.bxs-video-container {
  
}
.bxs-video {

}`}
        </textarea>
      </div>
    </div>
  );
}
