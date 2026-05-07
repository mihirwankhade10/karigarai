// Cloudinary client + buffer upload helpers.
//
// We use signed (server-side) uploads authenticated by api_key + api_secret.
// No upload preset is required \u2014 presets are only for unsigned client-side
// uploads where the browser talks to Cloudinary directly.

const cloudinary = require('cloudinary').v2;

let configured = false;
function configure() {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

/**
 * Upload an image buffer (signed, server-side).
 * Returns secure_url.
 */
function uploadImageBuffer(buffer, { publicId } = {}) {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'karigarai/photos',
        public_id: publicId,
        overwrite: true,
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

/**
 * Upload a video buffer (signed, server-side).
 * Returns secure_url.
 */
function uploadVideoBuffer(buffer, { publicId } = {}) {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'karigarai/videos',
        public_id: publicId,
        overwrite: true,
        chunk_size: 6 * 1024 * 1024, // 6MB chunks for large uploads
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

async function ping() {
  configure();
  return cloudinary.api.ping();
}

module.exports = { configure, uploadImageBuffer, uploadVideoBuffer, ping };
