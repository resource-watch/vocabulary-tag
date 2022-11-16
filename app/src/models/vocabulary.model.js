const mongoose = require('mongoose');

const { Schema } = mongoose;
const { RESOURCES } = require('app.constants');
const { STATUS } = require('app.constants');

const Vocabulary = new Schema({
    id: { type: String, required: true, trim: true },
    application: {
        type: String, required: true, trim: true, default: 'rw'
    },
    resources: [{
        _id: false,
        id: { type: String, required: true, trim: true },
        dataset: { type: String, required: true, trim: true },
        type: {
            type: String, required: true, trim: true, enum: RESOURCES
        },
        tags: [{ type: String, required: true, trim: true }]
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    status: { type: String, enum: STATUS, default: 'published' }
});

module.exports = mongoose.model('Vocabulary', Vocabulary);
