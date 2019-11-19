const mongoose = require('mongoose');

const { Schema } = mongoose;
const { RESOURCES } = require('app.constants');

const Favourite = new Schema({
    resourceId: { type: String, required: true, trim: true },
    application: {
        type: String, required: true, trim: true, default: 'rw'
    },
    resourceType: {
        type: String, required: true, trim: true, enum: RESOURCES
    },
    userId: { type: String, required: true, trim: true },
    createdAt: { type: Date, required: true, default: Date.now }
}, { usePushEach: true });

module.exports = mongoose.model('Favourite', Favourite);
