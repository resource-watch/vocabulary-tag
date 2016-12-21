'use strict';

const logger = require('logger');
const config = require('config');
const Vocabulary = require('models/vocabulary');
const Resource = require('models/resource');
const ResourceNotFound = require('errors/resourceNotFound');
const ResourceDuplicated = require('errors/resourceDuplicated');

class ResourceService {

    static * get(dataset, resource){
        let query = {
            dataset: dataset,
            'resource.id': resource.id,
            'resource.type': resource.type
        };
        logger.debug('Getting vocabularies by resource');
        return yield Resource.find(query).exec();
    }

    static * create(){
        return true;
    }

    static * update(){
        return true;
    }

    static * delete(){
        return true;
    }

    /*
    * @returns: hasPermission: <Boolean>
    */
    static * hasPermission(){
        return true;
    }

}

module.exports = ResourceService;
