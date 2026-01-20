
// Mock implementation for image-size BMP module
// This is needed because the image-size package tries to import BMP parsing
// which is not available in React Native environment

module.exports = {
  // Mock BMP detector function
  detect: () => false,
  
  // Mock BMP calculate function
  calculate: () => ({
    width: 1,
    height: 1,
    type: 'bmp',
  }),
};
