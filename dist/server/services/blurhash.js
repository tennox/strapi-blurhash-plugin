"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@strapi/utils");
const node_http_1 = __importDefault(require("node:http"));
const node_https_1 = __importDefault(require("node:https"));
const sharp_1 = __importDefault(require("sharp"));
const blurhash_1 = require("blurhash");
const loadImage = (uri) => new Promise((resolve, reject) => {
    let baseUrl = (0, utils_1.getAbsoluteServerUrl)(strapi.config);
    if (baseUrl.endsWith('/'))
        baseUrl = baseUrl.slice(0, -1);
    if (uri.startsWith('/'))
        uri = uri.slice(1);
    let url = uri.startsWith('http') ? uri : `${baseUrl}/${uri}`;
    (url.startsWith('https') ? node_https_1.default : node_http_1.default).get(url, res => {
        const data = [];
        res.on('data', chunk => data.push(chunk))
            .on('error', e => reject(e))
            .on('end', () => resolve(Buffer.concat(data)));
    });
});
const encodeImage = async (buffer) => {
    const image = (0, sharp_1.default)(buffer);
    const { width, height } = await image.metadata();
    let w, h;
    w = h = 32;
    if (width > height)
        w = Math.round(w * width / height);
    else
        h = Math.round(h * height / width);
    const { data, info } = await image
        .raw()
        .ensureAlpha()
        .resize(w, h, { fit: 'fill' })
        .toBuffer({ resolveWithObject: true });
    let kernw, kernh;
    kernw = kernh = 3;
    if (info.width > info.height)
        kernw = Math.round(kernw * info.width / info.height);
    else
        kernh = Math.round(kernh * info.height / info.width);
    const buf = new Uint8ClampedArray(data);
    return (0, blurhash_1.encode)(buf, info.width, info.height, kernw, kernh);
};
const testLoadAndEncode = async () => {
    const image = await loadImage('https://liangqinphotos.blob.core.windows.net/strapi-uploads/assets/image_8bd76becb2.png');
    const hash = await encodeImage(image);
    console.log(hash);
};
exports.default = ({ strapi }) => ({
    async generateBlurhash(file) {
        var _a;
        try {
            const isPrivate = (_a = await strapi.plugin("upload").provider.isPrivate()) !== null && _a !== void 0 ? _a : false;
            const { url } = isPrivate
                ? await strapi.plugin("upload").provider.getSignedUrl(file)
                : file;
            const image = await loadImage(url);
            const hash = await encodeImage(image);
            return hash;
        }
        catch (e) {
            strapi.log.error(e);
            return null;
        }
    },
});
