const mongoose = require('mongoose');

const { Schema } = mongoose;

const Collection = new Schema({
    name: { type: String, required: true, trim: true },
    application: {
        type: String, required: true, trim: true, default: 'rw'
    },
    ownerId: { type: String, required: true, trim: true },
    resources: [{
        _id: false,
        id: { type: String, required: true, trim: true },
        type: { type: String, required: true, trim: true }
    }]
});

module.exports = mongoose.model('Collection', Collection);
