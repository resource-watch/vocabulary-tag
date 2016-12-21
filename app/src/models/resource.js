'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const RESOURCES = require('appConstants').RESOURCES;
const STATUS = require('appConstants').STATUS;

var Resource = new Schema({
    id: {type: String, required: true, trim: true},
    dataset: {type: String, required: true, trim: true},
    type: {type: String, required: true, trim: true, enum: RESOURCES},
    vocabularies: [{
        _id: false,
        id: {type: String, required: true, trim: true},
        tags: [{type: String, required: true, trim: true}]
    }]
});

module.exports = mongoose.model('Resource', Resource);
