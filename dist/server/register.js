"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => {
    strapi.plugin('upload').contentTypes.file.attributes.blurhash = {
        type: 'text',
    };
};
