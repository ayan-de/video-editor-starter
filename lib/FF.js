const { spawn } = require("node:child_process");

const makeThumbnail = (fullPath, thumbnailPath) => {
  //ffmpeg -i 4AM-Chalisa.mp4 -ss 5 -vframes 1 thumbnail.jpg
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      fullPath,
      "-ss",
      "5",
      "-vframes",
      "1",
      thumbnailPath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`FFmpeg existed with this code: ${code}`);
      }
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
};

const getDimensions = (fullPath) => {
  //ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 input.mp4
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0",
      fullPath,
    ]);

    let dimensions = "";

    ffprobe.stdout.on("data", (data) => {
      dimensions += data.toString("utf-8");
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        dimensions = dimensions.replace(/\s/g, "").split(",");
        console.log(dimensions);
        resolve({
          width: Number(dimensions[0]),
          height: Number(dimensions[1]),
        });
      } else {
        reject(`FFmpeg existed with this code: ${code}`);
      }
    });

    ffprobe.on("error", (error) => {
      reject(error);
    });
  });
};

const extractAudio = (originalVideopath, tagetAudiopath) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      originalVideopath,
      "-vn",
      "-c:a",
      "copy",
      tagetAudiopath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`FFmpeg existed with this code: ${code}`);
      }
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
};

const resize = (originalVideopath, tagetVideopath, width, height) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      originalVideopath,
      "-vf",
      `scale=${width}:${height}`,
      "-c:a",
      "copy",
      "-threads",
      "2",
      "-y",
      tagetVideopath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`FFmpeg existed with this code: ${code}`);
      }
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
};

module.exports = { makeThumbnail, getDimensions, extractAudio, resize };
