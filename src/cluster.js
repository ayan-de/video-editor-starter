const cluster = require("node:cluster");
const JobQueue = require("../lib/JobQueue.js");

//if  it is a  parent process
if (cluster.isPrimary) {
  const job = new JobQueue();

  const coreCount = require("node:os").availableParallelism();

  for (let index = 0; index < coreCount; index++) {
    cluster.fork();
  }

  //making sure only one ffmpeg process at a time
  //so a child process first send message to the parent
  //then that ffmpeg process starts
  //so resizes are done using parent process
  cluster.on("message", (worker, message) => {
    if (message.messageType === "new-resize") {
      const { videoId, width, height } = message.data;
      job.enqueue({
        type: "resize",
        videoId,
        width,
        height,
      });
    }
  });

  //on failure we create a new child
  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `Worker ${worker.process.pid} died (${signal} | ${code}) .Restarting`
    );

    cluster.fork();
  });
} else {
  require("./index.js");
}
