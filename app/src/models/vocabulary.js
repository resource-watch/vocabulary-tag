const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const RESOURCES = require('appConstants').RESOURCES;
const STATUS = require('appConstants').STATUS;

const Vocabulary = new Schema({
    id: { type: String, required: true, trim: true },
    resources: [{
        _id: false,
        id: { type: String, required: true, trim: true },
        dataset: { type: String, required: true, trim: true },
        type: { type: String, required: true, trim: true, enum: RESOURCES },
        tags: [{ type: String, required: true, trim: true }]
    }],
    userId: { type: String, required: false, trim: true, default: 'legacy' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    status: { type: String, enum: STATUS, default: 'published' }
});

module.exports = mongoose.model('Vocabulary', Vocabulary);
