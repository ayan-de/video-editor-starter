const DB = require("../src/DB");
const FF = require("./FF");
const util = require("./util");

//Queue Based Processing Design Pattern
class JobQueue {
  constructor() {
    this.job = [];
    this.currentJob = null;
  }

  enqueue(job) {
    console.log("Enqued");
    this.job.push(job);
    this.executeNext();
  }

  dequeue() {
    //pop returns the last element form aray
    //shift returns the first element form the array
    //["video 1","video 2","video 3"]
    //we want video 1 which will be returned by shift function
    return this.job.shift();
  }

  executeNext() {
    //if we do have a current job then dont do anything
    if (this.currentJob) return;
    //we entered here means we dont have a current job
    //if we dont have a current job we will dequeue an item
    //and execute that item
    this.currentJob = this.dequeue();
    //this is the exit point of our app where we dont have any current job
    if (!this.currentJob) return;
    //we are here means we have a current job so execute it
    this.execute(this.currentJob);
  }

  async execute(job) {
    const { type, videoId, width, height } = job;
    //ffmpeg logic
    if (type === "resize") {
      DB.update();
      const video = DB.videos.find((video) => video.videoId === videoId);
      //refer image to understand the data pattern
      video.resizes[`${width}x${height}`] = { processing: true };
      DB.save();

      const originalVideopath = `./storage/${video.videoId}/original.${video.extension}`;
      const tagetVideopath = `./storage/${video.videoId}/${width}x${height}.${video.extension}`;

      try {
        await FF.resize(originalVideopath, tagetVideopath, width, height);

        DB.update();
        const video = DB.videos.find((video) => video.videoId === videoId);
        video.resizes[`${width}x${height}`].processing = false;
        DB.save();

        console.log("Done resizing. Jobs remaining: ", this.job.length);
      } catch (e) {
        util.deleteFile(tagetVideopath);
        return handleErr(e);
      }
    }

    //making disappear the current above job
    this.currentJob = null;
    //as soon as operation gets completed we call executeNext()
    this.executeNext();
  }
}

module.exports = JobQueue;
