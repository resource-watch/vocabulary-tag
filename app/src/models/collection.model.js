const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const { Schema } = mongoose;

const { RESOURCES } = require('app.constants');

const Collection = new Schema({
    name: { type: String, required: true, trim: true },
    application: {
        type: String, required: true, trim: true, default: 'rw'
    },
    ownerId: { type: String, required: true, trim: true },
    env: {
        type: String, required: true, default: 'production', trim: true
    },
    resources: [{
        _id: false,
        id: { type: String, required: true, trim: true },
        type: {
            type: String, required: true, trim: true, enum: RESOURCES
        }
    }]
});
Collection.plugin(mongoosePaginate);

module.exports = mongoose.model('Collection', Collection);
