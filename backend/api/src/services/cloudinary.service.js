// Thin re-export of the shared Cloudinary lib so api/ services can import it
// without reaching into ../../../lib in every route file.
const { uploadImageBuffer, uploadVideoBuffer } = require('../../../lib/cloudinary');

async function uploadSelfie(buffer, candidateId) {
  return uploadImageBuffer(buffer, {
    publicId: candidateId ? `selfies/${candidateId}` : undefined,
  });
}

async function uploadInterviewVideo(buffer, candidateId) {
  const ts = Date.now();
  return uploadVideoBuffer(buffer, {
    publicId: `interviews/${candidateId}/${ts}`,
  });
}

module.exports = { uploadSelfie, uploadInterviewVideo };
