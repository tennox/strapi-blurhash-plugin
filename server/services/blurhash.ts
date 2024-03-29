import { Strapi } from '@strapi/strapi';
import { getAbsoluteServerUrl } from '@strapi/utils';

import http from 'node:http'; 
import https from 'node:https'; 

import sharp from 'sharp';
import { encode } from 'blurhash';

const loadImage = (uri: string): Promise<Buffer> => new Promise((resolve, reject) => {
    let baseUrl = getAbsoluteServerUrl(strapi.config);
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    if (uri.startsWith('/')) uri = uri.slice(1)
    let url = uri.startsWith('http') ? uri : `${baseUrl}/${uri}`;
    (url.startsWith('https') ? https : http).get(url, res => {
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
    async generateBlurhash(file) {
        try {
            const isPrivate = await strapi.plugin("upload").provider.isPrivate() ?? false;
            const { url } = isPrivate
                ? await strapi.plugin("upload").provider.getSignedUrl(file)
                : file;
            const image: Buffer = await loadImage(url);
            const hash = await encodeImage(image);
            return hash;
        } catch (e) {
            strapi.log.error(e);
            return null;
        }
    },
});

