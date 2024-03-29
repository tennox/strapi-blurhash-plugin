"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PLUGIN_NAME = 'strapi-blurhash-plugin';
exports.default = ({ strapi }) => {
    const generateBlurhash = async (event, eventType) => {
        const { data, where } = event.params;
        if ((data.mime && data.mime.startsWith('image/'))) {
            data.blurhash = await strapi.plugin(PLUGIN_NAME).service('blurhash').generateBlurhash(data);
        }
        if (eventType === 'beforeUpdate' && strapi.plugin(PLUGIN_NAME).config('regenerateOnUpdate') === true) {
            const fullData = await strapi.db.query('plugin::upload.file').findOne({
                select: ['url', 'blurhash', 'name', 'mime'],
                where
            });
            if ((fullData.mime && fullData.mime.startsWith('image/')) && !fullData.blurhash) {
                data.blurhash = await strapi.plugin(PLUGIN_NAME).service('blurhash').generateBlurhash(fullData);
            }
        }
    };
    strapi.db.lifecycles.subscribe({
        models: ['plugin::upload.file'],
        beforeCreate: (event) => generateBlurhash(event, 'beforeCreate'),
        beforeUpdate: (event) => generateBlurhash(event, 'beforeUpdate'),
    }); // FIXME: remove this `as any` after https://github.com/strapi/strapi/pull/17847 is merged.
};
