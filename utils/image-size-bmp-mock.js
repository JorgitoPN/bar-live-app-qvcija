
// Mock module for image-size bmp module
// This is needed because the image-size package tries to require './bmp' 
// but the module is missing in some installations

module.exports = {
  // Minimal BMP detection function
  detect: function(buffer) {
    return buffer && buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4D;
  },
  
  // Minimal BMP size calculation
  calculate: function(buffer) {
    if (!buffer || buffer.length < 26) {
      return { width: 0, height: 0 };
    }
    
    return {
      width: buffer.readUInt32LE(18),
      height: buffer.readUInt32LE(22)
    };
  }
};
