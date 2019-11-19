const mongoose = require('mongoose');

const { Schema } = mongoose;
const { RESOURCES } = require('app.constants');

const Resource = new Schema({
    id: { type: String, required: true, trim: true },
    dataset: { type: String, required: true, trim: true },
    type: {
        type: String, required: true, trim: true, enum: RESOURCES
    },
    vocabularies: [{
        _id: false,
        id: { type: String, required: true, trim: true },
        application: {
            type: String, required: true, trim: true, default: 'rw'
        },
        tags: [{ type: String, required: true, trim: true }]
    }]
}, { usePushEach: true });

module.exports = mongoose.model('Resource', Resource);
