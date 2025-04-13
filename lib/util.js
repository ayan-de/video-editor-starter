const fs = require("node:fs/promises");
const util = {};

//delete a folder if exist otherwise error
util.deleteFile = async (path) => {
  try {
    await fs.unlink(path);
  } catch (e) {
    //do nothing
  }
};

//Delete a folder if exists, if not the funciton will not throw an error
util.deleteFolder = async (path) => {
  try {
    await fs.rm(path, { recursive: true });
  } catch (e) {
    //do nothing
  }
};
module.exports = util;
