const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const { pipeline } = require("node:stream/promises");
const util = require("../../lib/util");
const DB = require("../DB");
const FF = require("../../lib/FF");
const JobQueue = require("../../lib/JobQueue");

const job = new JobQueue();

//returns the list of all the videos by the logged in user
const getVideos = (req, res, handleErr) => {
  DB.save();
  const videos = DB.videos.filter((video) => {
    return video.userId === req.userId;
  });

  res.status(200).json(videos);
};

const uploadVideo = async (req, res, handleErr) => {
  const specifiedFileName = req.headers.filename;
  const extension = path.extname(specifiedFileName).substring(1).toLowerCase();
  const name = path.parse(specifiedFileName).name;
  const videoId = crypto.randomBytes(4).toString("hex");

  const FORMATS_SUPPORTED = ["mov", "mp4"];

  if (FORMATS_SUPPORTED.indexOf(extension) == -1) {
    return handleErr({
      status: 400,
      message: "Only mov and mp4 format are allowed",
    });
  }

  try {
    await fs.mkdir(`./storage/${videoId}`);
    //original video path
    const fullPath = `./storage/${videoId}/original.${extension}`;
    const file = await fs.open(fullPath, "w");
    const fileStream = file.createWriteStream();
    const thumbnailPath = `./storage/${videoId}/thumbnail.jpg`;

    //   req.pipe(fileStream);
    await pipeline(req, fileStream);

    //Make a thumbnail of the video file
    await FF.makeThumbnail(fullPath, thumbnailPath);

    //Get the dimensions
    const dimensions = await FF.getDimensions(fullPath);

    DB.update();
    DB.videos.unshift({
      id: DB.videos.length,
      videoId,
      extension,
      dimensions,
      userId: req.userId,
      extractedAudio: false,
      resizes: {},
    });

    DB.save();

    res.status(201).json({
      status: "success",
      message: "The file was uploaded successfully!",
    });
  } catch (error) {
    util.deleteFolder(`./storage/${videoId}`);
    if (error.code !== "ECONNRESET") return handleErr(error);
  }
};

const extractAudio = async (req, res, handleErr) => {
  const videoId = req.params.get("videoId");

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  //we will extact audio only once per video
  if (video.extractedAudio) {
    return handleErr({
      status: 400,
      message: "Audio already extracted",
    });
  }

  let originalVideopath;
  let tagetAudiopath;
  try {
    originalVideopath = `./storage/${videoId}/original.${video.extension}`;
    tagetAudiopath = `./storage/${videoId}/audio.aac`;

    await FF.extractAudio(originalVideopath, tagetAudiopath);

    video.extractAudio = true;

    DB.save();

    res.status(200).json({
      status: "success",
      message: "Audio was extracted successfully",
    });
  } catch (error) {
    util.deleteFile(tagetAudiopath);
    return handleErr(error);
  }
};

//return a video assest to a client
const getVideoAssest = async (req, res, handleErr) => {
  const videoId = req.params.get("videoId");
  const type = req.params.get("type"); //thumbnail , audio, download, resize

  DB.update();

  const video = DB.videos.find((video) => video.videoId === videoId);

  if (!video) {
    return handleErr({
      status: 400,
      message: "Video not found!",
    });
  }

  let file;
  let mineType;
  let filename; //final file name for the download(including the extension)

  switch (type) {
    case "thumbnail":
      file = await fs.open(`./storage/${videoId}/thumbnail.jpg`, "r");
      mineType = "image/jpeg";
      break;

    case "audio":
      file = await fs.open(`./storage/${videoId}/audio.aac`, "r");
      mineType = "audio/aac";
      filename = `${video.name}-audio.aac`;
      break;

    case "resize":
      const dimensions = req.params.get("dimensions");
      file = await fs.open(
        `./storage/${videoId}/${dimensions}.${video.extension}`,
        "r"
      );
      mineType = "video/mp4";
      filename = `${video.name}-${video.dimensions}.${video.extension}`;
      break;

    case "original":
      file = await fs.open(
        `./storage/${videoId}/original.${video.extension}`,
        "r"
      );
      mineType = "video/mp4";
      filename = `${video.name}.${video.extension}`;
      break;
  }

  //grab the file size
  const stat = await file.stat();

  const fileStream = file.createReadStream();

  if (type != "thumbnail") {
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  }

  //set the Content-Type header based on file type
  res.setHeader("Content-Type", mineType);

  //Set the Content-Length to th e size of the file
  res.setHeader("Content-length", stat.size);

  res.status(200);

  await pipeline(fileStream, res);

  file.close();
};

const resizeVideo = async (req, res, handleErr) => {
  //example payload(Json Body)
  // {videoId: "1e7318df", width: "600", height: "300"}
  const videoId = req.body.videoId;
  const width = Number(req.body.width);
  const height = Number(req.body.height);

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);
  //refer image to understand the data pattern
  video.resizes[`${width}x${height}`] = { processing: true };

  // const originalVideopath = `./storage/${video.videoId}/original.${video.extension}`;
  // const tagetVideopath = `./storage/${video.videoId}/${width}x${height}.${video.extension}`;

  job.enqueue({
    type: "resize",
    videoId,
    width,
    height,
  });
  // await FF.resize(originalVideopath, tagetVideopath, width, height);

  // video.resizes[`${width}x${height}`].processing = false;
  // DB.save();

  res.status(200).json({
    status: "success",
    message: "The video is now being processed!",
  });
};

const controller = {
  getVideos,
  uploadVideo,
  getVideoAssest,
  extractAudio,
  resizeVideo,
};

module.exports = controller;
