import { Strapi } from '@strapi/strapi';

import https from 'node:https';

import sharp from 'sharp';
import { encode } from 'blurhash';

const loadImage = (url: string): Promise<Buffer> => new Promise((resolve, reject) => {
    https.get(url, res => {
        const data = [];
        res.on('data', chunk => data.push(chunk))
           .on('error', e => reject(e))
           .on('end', () => resolve(Buffer.concat(data)));
    });
});

const encodeImage = async (buffer: Buffer): Promise<string> => {
    const image = sharp(buffer);
    const { width, height } = await image.metadata();

    let w, h;
    w = h = 32;
    if (width > height) w = Math.round(w * width/height);
    else                h = Math.round(h * height/width);

    const { data, info } = await image
        .raw()
        .ensureAlpha()
        .resize(w, h, { fit: 'fill' })
        .toBuffer({ resolveWithObject: true });

    let kernw, kernh;
    kernw = kernh = 3;
    if (info.width > info.height) kernw = Math.round(kernw * info.width / info.height);
    else                          kernh = Math.round(kernh * info.height / info.width);

    const buf = new Uint8ClampedArray(data);
    return encode(buf, info.width, info.height, kernw, kernh);
}

const testLoadAndEncode = async () => {
    const image = await loadImage('https://liangqinphotos.blob.core.windows.net/strapi-uploads/assets/image_8bd76becb2.png');
    const hash = await encodeImage(image);
    console.log(hash);
};

export default ({ strapi }: { strapi: Strapi }) => ({
    async generateBlurhash(url) {
        try {
            const image: Buffer = await loadImage(url);
            const hash = await encodeImage(image);
            return hash;
        } catch (e) {
            strapi.log.error(e);
            return null;
        }
    },
});

