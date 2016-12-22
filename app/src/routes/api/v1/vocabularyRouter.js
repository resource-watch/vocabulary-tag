'use strict';

var Router = require('koa-router');
var logger = require('logger');
var config = require('config');
const VocabularyService = require('services/vocabularyService');
const ResourceService = require('services/resourceService');
const RelationshipService = require('services/relationshipService');
const VocabularySerializer = require('serializers/vocabularySerializer');
const ResourceSerializer = require('serializers/resourceSerializer');
const VocabularyValidator = require('validators/vocabularyValidator');
const VocabularyNotFound = require('errors/vocabularyNotFound');
const VocabularyDuplicated = require('errors/vocabularyDuplicated');
const VocabularyNotValid = require('errors/vocabularyNotValid');
const RelationshipDuplicated = require('errors/relationshipDuplicated');
const ConsistencyViolation = require('errors/consistencyViolation');
const RelationshipNotFound = require('errors/relationshipNotFound');
const ResourceNotFound = require('errors/resourceNotFound');
const USER_ROLES = require('appConstants').USER_ROLES;

var router = new Router();

class VocabularyRouter {

    static getResource(params){
        let resource = {id: params.dataset, type: 'dataset'};
        if(params.layer){
            resource = {id: params.layer, type: 'layer'};
        }
        else if(params.widget){
            resource = {id: params.widget, type: 'widget'};
        }
        else{}
        return resource;
    }

    static getResourceTypeByPath(path){
        let type = 'dataset';
        if(path.indexOf('layer') > -1){
            type = 'layer';
        }
        else if(path.indexOf('widget') > -1){
            type = 'widget';
        }
        else{}
        return type;
    }

    static * get(){
        let query = this.request.query;
        if(Object.keys(query).length === 0){
            this.throw(400, 'Vocabulary and Tags are required in the queryParams');
            return;
        }
        logger.info(`Getting resources by vocabulary-tag`);
        let resource = {};
        resource.type = VocabularyRouter.getResourceTypeByPath(this.path);
        let result = yield VocabularyService.get(resource, query);
        this.body = VocabularySerializer.serialize(result);
    }

    static * create(){
        logger.info(`Creating vocabulary with name: ${this.request.body.name}`);
        try{
            let user = this.request.body.loggedUser;
            let result = yield VocabularyService.create(user, this.request.body);
            this.body = VocabularySerializer.serialize(result);
        } catch(err) {
            if(err instanceof VocabularyDuplicated){
                this.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static * update(){
        logger.info(`Updating vocabulary with name: ${this.request.body.name}`);
        try{
            let user = this.request.body.loggedUser;
            let result = yield VocabularyService.update(user, this.request.body);
            this.body = VocabularySerializer.serialize(result);
        } catch(err) {
            if(err instanceof VocabularyNotFound){
                this.throw(400, err.message);
                return;
            }
            else if(err instanceof ConsistencyViolation){
                this.throw(409, err.message);
                return;
            }
            throw err;
        }
    }

    static * delete(){
        logger.info(`Updating vocabulary with name: ${this.request.body.name}`);
        try{
            let user = this.request.body.loggedUser;
            let result = yield VocabularyService.delete(user, this.request.body);
            this.body = VocabularySerializer.serialize(result);
        } catch(err) {
            if(err instanceof VocabularyNotFound){
                this.throw(400, err.message);
                return;
            }
            else if(err instanceof ConsistencyViolation){
                this.throw(409, err.message);
                return;
            }
            throw err;
        }
    }

    static * getAll(){
        logger.info('Getting all vocabularies');
        let filter = {};
        if(this.query.limit){filter.limit = this.query.limit;}
        let result = yield VocabularyService.getAll(filter);
        this.body = VocabularySerializer.serialize(result);
    }

    static * getById(){
        logger.info(`Getting vocabulary by name: ${this.params.vocabulary}`);
        var name = this.params.vocabulary;
        let result = yield VocabularyService.getById(name);
        this.body = VocabularySerializer.serialize(result);
    }

    /* Using the Resource Service */

    static * getByResource(){
        let resource = VocabularyRouter.getResource(this.params);
        logger.info(`Getting vocabularies of ${resource.type}: ${resource.id}`);
        let filter = {};
        let result = yield ResourceService.get(this.params.dataset, resource, this.params.vocabulary);
        this.body = ResourceSerializer.serialize(result);
    }

    static * getByIds(){
        if(!this.request.body.ids){
            this.throw(400, 'Bad request');
            return;
        }
        logger.info(`Getting vocabularies by ids: ${this.request.body.ids}`);
        let resource = {
            ids: this.request.body.ids
        };
        if(typeof resource.ids === 'string'){
            resource.ids = resource.ids.split(',').map(function(elem){return elem.trim();});
        }
        resource.type = VocabularyRouter.getResourceTypeByPath(this.path);
        let result = yield ResourceService.getByIds(resource);
        this.body = ResourceSerializer.serialize(result);
    }

    static * createRelationship(){
        let dataset = this.params.dataset;
        let vocabulary = {name: this.params.vocabulary};
        let resource = VocabularyRouter.getResource(this.params);
        let body = this.request.body;
        logger.info(`Creating realtionship between vocabulary: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        try{
            let user = this.request.body.loggedUser;
            let result = yield RelationshipService.create(user, vocabulary, dataset, resource, body);
            this.body = ResourceSerializer.serialize(result);
        } catch(err) {
            if(err instanceof RelationshipDuplicated){
                this.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static * deleteRelationship(){
        let dataset = this.params.dataset;
        let vocabulary = {name: this.params.vocabulary};
        let resource = VocabularyRouter.getResource(this.params);
        logger.info(`Deleting Relationship between: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        try{
            let user = this.request.body.loggedUser;
            let result = yield RelationshipService.updateTagsFromRelationship(user, vocabulary, dataset, resource);
            this.body = ResourceSerializer.serialize(result);
        } catch(err) {
            if(err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound){
                this.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static * updateRelationshipTags(){
        let dataset = this.params.dataset;
        let vocabulary = {name: this.params.vocabulary};
        let resource = VocabularyRouter.getResource(this.params);
        let body = this.request.body; //VALIDATE if body.tags > 0 in other case validation erro
        logger.info(`Updating tags of relationship: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        try{
            let user = this.request.body.loggedUser;
            let result = yield RelationshipService.updateTagsFromRelationship(user, vocabulary, dataset, resource, body);
            this.body = ResourceSerializer.serialize(result);
        } catch(err) {
            if(err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound){
                this.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

}

// Negative checking
const authorizationMiddleware = function*(next) {
    this.request.body.loggedUser = {
      'id': '5810d796e97e7b2d6a1fdab7',
      'provider': 'local',
      'providerId': null,
      'email': 'prueba@vizzuality.com',
      'role': 'ADMIN',
      'createdAt': '2016-10-26T16:19:34.728Z',
      'extraUserData': {
        'apps': [
          'gfw',
          'prep'
        ]
      },
      'iat': 1480526868
    };
    yield next; // SUPERADMIN is included here
};

// Validator Wrapper
const validationMiddleware = function*(next){
    yield next;
};


// dataset
router.get('/dataset/:dataset/vocabulary', VocabularyRouter.getByResource); //get ALL vocabularies (name and tags) for that dataset -> Go To Resource Model
router.get('/dataset/:dataset/vocabulary/:vocabulary', VocabularyRouter.getByResource); //get the desired vocabulary for that dataset -> Go To Resource Model @TODO not yet
router.get('/dataset/vocabulary', VocabularyRouter.get); //get resources of that vocabulary and vocabulary tags ? queryParams (it's a query) -> Go To Vocabulary Model (very important) reason we've model 2 schemas
router.post('/dataset/:dataset/vocabulary/:vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.createRelationship); // Create relationship
router.patch('/dataset/:dataset/vocabulary/:vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.updateRelationshipTags); // Modify terms of that relationship
router.delete('/dataset/:dataset/vocabulary/:vocabulary', authorizationMiddleware, VocabularyRouter.deleteRelationship); // Delete relationship

// widget
router.get('/dataset/:dataset/widget/:widget/vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/widget/vocabulary', VocabularyRouter.get);
router.post('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.createRelationship);
router.patch('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.updateRelationshipTags);
router.delete('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', authorizationMiddleware, VocabularyRouter.deleteRelationship);

// layer
router.get('/dataset/:dataset/layer/:layer/vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/layer/vocabulary', VocabularyRouter.get);
router.post('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.createRelationship);
router.patch('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.updateRelationshipTags);
router.delete('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', authorizationMiddleware, VocabularyRouter.deleteRelationship);

// vocabulary (not the commmon use case)
router.get('/vocabulary', VocabularyRouter.getAll); // Get all vocabularies
router.get('/vocabulary/:vocabulary', VocabularyRouter.getById); // Get a particular vocabulary
router.post('/vocabulary/:vocabulary', VocabularyRouter.create); // Create a particular vocabulary
router.patch('/vocabulary/:vocabulary', VocabularyRouter.update); // Update a particular vocabulary JUST SUPERADMIN
router.delete('/vocabulary/:vocabulary', VocabularyRouter.delete); // Delete a particular vocabulary JUST SUPERADMIN

// get by ids (to include queries)
router.post('/dataset/vocabulary/get-by-ids', VocabularyRouter.getByIds); //get vocabularies from ids -> go to Resource Model
router.post('/dataset/:dataset/widget/vocabulary/get-by-ids', VocabularyRouter.getByIds);
router.post('/dataset/:dataset/layer/vocabulary/get-by-ids', VocabularyRouter.getByIds);

module.exports = router;
