
const Router = require('koa-router');
const logger = require('logger');
const VocabularyService = require('services/vocabularyService');
const ResourceService = require('services/resourceService');
const RelationshipService = require('services/relationshipService');
const VocabularySerializer = require('serializers/vocabularySerializer');
const ResourceSerializer = require('serializers/resourceSerializer');
const VocabularyValidator = require('validators/vocabularyValidator');
const VocabularyNotFound = require('errors/vocabularyNotFound');
const VocabularyDuplicated = require('errors/vocabularyDuplicated');
const VocabularyNotValid = require('errors/vocabularyNotValid');
const RelationshipValidator = require('validators/relationshipValidator');
const CloneValidator = require('validators/cloneValidator');
const RelationshipsValidator = require('validators/relationshipsValidator');
const RelationshipDuplicated = require('errors/relationshipDuplicated');
const RelationshipNotValid = require('errors/relationshipNotValid');
const CloneNotValid = require('errors/cloneNotValid');
const RelationshipsNotValid = require('errors/relationshipsNotValid');
const RelationshipNotFound = require('errors/relationshipNotFound');
const ConsistencyViolation = require('errors/consistencyViolation');
const ResourceNotFound = require('errors/resourceNotFound');
const USER_ROLES = require('appConstants').USER_ROLES;

const router = new Router();

class VocabularyRouter {

    static getResource(params) {
        let resource = { id: params.dataset, type: 'dataset' };
        if (params.layer) {
            resource = { id: params.layer, type: 'layer' };
        } else if (params.widget) {
            resource = { id: params.widget, type: 'widget' };
        }
        return resource;
    }

    static getResourceTypeByPath(path) {
        let type = 'dataset';
        if (path.indexOf('layer') > -1) {
            type = 'layer';
        } else if (path.indexOf('widget') > -1) {
            type = 'widget';
        }
        return type;
    }

    static * get() {
        const query = this.request.query;
        if (Object.keys(query).length === 1) {
            this.throw(400, 'Vocabulary and Tags are required in the queryParams');
            return;
        }
        logger.info(`Getting resources by vocabulary-tag`);
        const resource = {};
        resource.type = VocabularyRouter.getResourceTypeByPath(this.path);
        const result = yield VocabularyService.get(resource, query);
        this.body = VocabularySerializer.serialize(result);
    }

    static * create() {
        logger.info(`Creating vocabulary with name: ${this.request.body.name}`);
        try {
            const user = this.request.body.loggedUser;
            const result = yield VocabularyService.create(user, this.request.body);
            this.body = VocabularySerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyDuplicated) {
                this.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static * update() {
        logger.info(`Updating vocabulary with name: ${this.request.body.name}`);
        try {
            const user = this.request.body.loggedUser;
            const result = yield VocabularyService.update(user, this.request.body);
            this.body = VocabularySerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound) {
                this.throw(400, err.message);
                return;
            } else if (err instanceof ConsistencyViolation) {
                this.throw(409, err.message);
                return;
            }
            throw err;
        }
    }

    static * delete() {
        logger.info(`Updating vocabulary with name: ${this.request.body.name}`);
        try {
            const user = this.request.body.loggedUser;
            const result = yield VocabularyService.delete(user, this.request.body);
            this.body = VocabularySerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound) {
                this.throw(400, err.message);
                return;
            } else if (err instanceof ConsistencyViolation) {
                this.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static * getAll() {
        logger.info('Getting all vocabularies');
        const filter = {};
        if (this.query.limit) { filter.limit = this.query.limit; }
        const result = yield VocabularyService.getAll(filter);
        this.body = VocabularySerializer.serialize(result);
    }

    static * getById() {
        logger.info(`Getting vocabulary by name: ${this.params.vocabulary}`);
        const vocabulary = { name: this.params.vocabulary };
        const result = yield VocabularyService.getById(vocabulary);
        this.body = VocabularySerializer.serialize(result);
    }

    /* Using the Resource Service */

    static * getByResource() {
        const resource = VocabularyRouter.getResource(this.params);
        logger.info(`Getting vocabularies of ${resource.type}: ${resource.id}`);
        const vocabulary = { name: this.params.vocabulary };
        const result = yield ResourceService.get(this.params.dataset, resource, vocabulary);
        this.body = ResourceSerializer.serialize(result);
    }

    static * getByIds() {
        if (!this.request.body.ids) {
            this.throw(400, 'Bad request');
            return;
        }
        logger.info(`Getting vocabularies by ids: ${this.request.body.ids}`);
        const resource = {
            ids: this.request.body.ids
        };
        if (typeof resource.ids === 'string') {
            resource.ids = resource.ids.split(',').map((elem) => elem.trim());
        }
        resource.type = VocabularyRouter.getResourceTypeByPath(this.path);
        const result = yield ResourceService.getByIds(resource);
        this.body = ResourceSerializer.serializeByIds(result); //
    }

    static * createRelationship() {
        const dataset = this.params.dataset;
        const vocabulary = { name: this.params.vocabulary };
        const resource = VocabularyRouter.getResource(this.params);
        const body = this.request.body;
        logger.info(`Creating realtionship between vocabulary: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        try {
            const user = this.request.body.loggedUser;
            const result = yield RelationshipService.create(user, vocabulary, dataset, resource, body);
            this.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof RelationshipDuplicated) {
                this.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static * createRelationships() {
        const dataset = this.params.dataset;
        const resource = VocabularyRouter.getResource(this.params);
        const body = this.request.body;
        const vocabularies = [];
        Object.keys(body).forEach(key => {
            if (key !== 'loggedUser') {
                vocabularies.push({
                    name: key,
                    tags: body[key].tags
                });
            }
        });
        vocabularies.forEach(vocabulary => {
            logger.info(`Creating realtionships between vocabulary: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        });
        try {
            const user = this.request.body.loggedUser;
            const result = yield RelationshipService.createSome(user, vocabularies, dataset, resource);
            this.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof RelationshipDuplicated) {
                this.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static * updateRelationships() {
        const dataset = this.params.dataset;
        const resource = VocabularyRouter.getResource(this.params);
        const body = this.request.body;
        logger.info(`Deleting All Vocabularies of resource: ${resource.type} - ${resource.id}`);
        try {
            const user = this.request.body.loggedUser;
            const result = yield RelationshipService.deleteAll(user, dataset, resource);
            this.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound) {
                this.throw(404, err.message);
                return;
            } else if (err instanceof RelationshipNotFound) {
                // do nothing
            } else {
                throw err;
            }
        }
        const vocabularies = [];
        Object.keys(body).forEach(key => {
            if (key !== 'loggedUser') {
                vocabularies.push({
                    name: key,
                    tags: body[key].tags
                });
            }
        });
        vocabularies.forEach(vocabulary => {
            logger.info(`Creating realtionships between vocabulary: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        });
        try {
            const user = this.request.body.loggedUser;
            const result = yield RelationshipService.createSome(user, vocabularies, dataset, resource);
            this.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof RelationshipDuplicated) {
                this.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static * deleteRelationship() {
        const dataset = this.params.dataset;
        const vocabulary = { name: this.params.vocabulary };
        const resource = VocabularyRouter.getResource(this.params);
        logger.info(`Deleting Relationship between: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        try {
            const user = this.request.body.loggedUser;
            const result = yield RelationshipService.delete(user, vocabulary, dataset, resource);
            this.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound) {
                this.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static * deleteRelationships() {
        const dataset = this.params.dataset;
        const resource = VocabularyRouter.getResource(this.params);
        // let vocabularies = this.request.query.vocabulary.split(',').map(function(vocabulary){
        //     return {
        //         name: vocabulary
        //     };
        // });
        // if (!vocabularies){
        //     this.throw(400, 'vocabularies are required in the queryParams');
        //     return;
        // }
        // vocabularies.forEach(function(vocabulary){
        //     logger.info(`Deleting Relationship between: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        // });
        logger.info(`Deleting All Vocabularies of resource: ${resource.type} - ${resource.id}`);
        try {
            const user = this.request.body.loggedUser;
            // let result = yield RelationshipService.deleteSome(user, vocabularies, dataset, resource);
            const result = yield RelationshipService.deleteAll(user, dataset, resource);
            this.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound) {
                this.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static * updateRelationshipTags() {
        const dataset = this.params.dataset;
        const vocabulary = { name: this.params.vocabulary };
        const resource = VocabularyRouter.getResource(this.params);
        const body = this.request.body;
        logger.info(`Updating tags of relationship: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        try {
            const user = this.request.body.loggedUser;
            const result = yield RelationshipService.updateTagsFromRelationship(user, vocabulary, dataset, resource, body);
            this.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound) {
                this.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static * concatTags() {
        const dataset = this.params.dataset;
        const vocabulary = { name: this.params.vocabulary };
        const resource = VocabularyRouter.getResource(this.params);
        const body = this.request.body;
        logger.info(`Conacatenating more tags in relationship: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        try {
            const user = this.request.body.loggedUser;
            const result = yield RelationshipService.concatTags(user, vocabulary, dataset, resource, body);
            this.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound) {
                this.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static * cloneVocabularyTags() {
        const dataset = this.params.dataset;
        const resource = VocabularyRouter.getResource(this.params);
        const body = this.request.body;
        const newDataset = body.newDataset;
        logger.info(`Cloning relationships: of resource ${resource.type} - ${resource.id} in ${newDataset}`);
        try {
            const user = this.request.body.loggedUser;
            const result = yield RelationshipService.cloneVocabularyTags(user, dataset, resource, body);
            this.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound) {
                this.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

}

// Negative checking
const relationshipAuthorizationMiddleware = function*(next) {
    // Get user from query (delete) or body (post-patch)
    const user = Object.assign({}, this.request.query.loggedUser ? JSON.parse(this.request.query.loggedUser) : {}, this.request.body.loggedUser);
    if (user.id === 'microservice') {
        yield next;
        return;
    }
    if (!user || USER_ROLES.indexOf(user.role) === -1) {
        this.throw(401, 'Unauthorized'); // if not logged or invalid ROLE-> out
        return;
    }
    if (user.role === 'USER') {
        this.throw(403, 'Forbidden'); // if USER -> out
        return;
    }
    if (user.role === 'MANAGER' || user.role === 'ADMIN') {
        const resource = VocabularyRouter.getResource(this.params);
        try {
            const permission = yield ResourceService.hasPermission(user, this.params.dataset, resource);
            if (!permission) {
                this.throw(403, 'Forbidden');
                return;
            }
        } catch (err) {
            throw err;
        }
    }
    yield next; // SUPERADMIN are included here
};

// Negative checking
const vocabularyAuthorizationMiddleware = function*(next) {
    // Get user from query (delete) or body (post-patch)
    const user = Object.assign({}, this.request.query.loggedUser ? JSON.parse(this.request.query.loggedUser) : {}, this.request.body.loggedUser);
    if (user.id === 'microservice') {
        yield next;
        return;
    }
    if (!user || USER_ROLES.indexOf(user.role) === -1) {
        this.throw(401, 'Unauthorized'); // if not logged or invalid ROLE -> out
        return;
    }
    if (this.request.method === 'POST' && user.role === 'ADMIN') {
        yield next;
        return;
    }
    if (user.role !== 'SUPERADMIN') {
        this.throw(403, 'Forbidden'); // Only SUPERADMIN
        return;
    }
    yield next; // SUPERADMIN is included here
};

// Resource Validator Wrapper
const relationshipValidationMiddleware = function*(next) {
    try {
        yield RelationshipValidator.validate(this);
    } catch (err) {
        if (err instanceof RelationshipNotValid) {
            this.throw(400, err.getMessages());
            return;
        }
        throw err;
    }
    yield next;
};

// RelationshipsValidator Wrapper
const relationshipsValidationMiddleware = function*(next) {
    try {
        yield RelationshipsValidator.validate(this);
    } catch (err) {
        if (err instanceof RelationshipsNotValid) {
            this.throw(400, err.getMessages());
            return;
        }
        throw err;
    }
    yield next;
};

// Vocabulary Validator Wrapper
const vocabularyValidationMiddleware = function*(next) {
    try {
        yield VocabularyValidator.validate(this);
    } catch (err) {
        if (err instanceof VocabularyNotValid) {
            this.throw(400, err.getMessages());
            return;
        }
        throw err;
    }
    yield next;
};

// Clone Validator Wrapper
const cloneValidationMiddleware = function*(next) {
    try {
        yield CloneValidator.validate(this);
    } catch (err) {
        if (err instanceof CloneNotValid) {
            this.throw(400, err.getMessages());
            return;
        }
        throw err;
    }
    yield next;
};

// dataset
router.get('/dataset/:dataset/vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/vocabulary/:vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/vocabulary/find', VocabularyRouter.get);
router.post('/dataset/:dataset/vocabulary', relationshipsValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationships);
router.put('/dataset/:dataset/vocabulary', relationshipsValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.updateRelationships);
router.post('/dataset/:dataset/vocabulary/:vocabulary', relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationship);
router.patch('/dataset/:dataset/vocabulary/:vocabulary', relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.updateRelationshipTags);
router.post('/dataset/:dataset/vocabulary/:vocabulary/concat', relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.concatTags);
router.post('/dataset/:dataset/vocabulary/clone/dataset', cloneValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.cloneVocabularyTags);
router.delete('/dataset/:dataset/vocabulary/:vocabulary', relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationship);
router.delete('/dataset/:dataset/vocabulary', relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationships);

// widget
router.get('/dataset/:dataset/widget/:widget/vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/widget/vocabulary/find', VocabularyRouter.get);
router.post('/dataset/:dataset/widget/:widget/vocabulary/', relationshipsValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationships);
router.post('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationship);
router.patch('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.updateRelationshipTags);
router.delete('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationship);
router.delete('/dataset/:dataset/widget/:widget/vocabulary', relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationships);

// layer
router.get('/dataset/:dataset/layer/:layer/vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/layer/vocabulary/find', VocabularyRouter.get);
router.post('/dataset/:dataset/layer/:layer/vocabulary', relationshipsValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationships);
router.post('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationship);
router.patch('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.updateRelationshipTags);
router.delete('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationship);
router.delete('/dataset/:dataset/layer/:layer/vocabulary', relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationships);

// vocabulary (not the commmon use case)
router.get('/vocabulary', VocabularyRouter.getAll);
router.get('/vocabulary/:vocabulary', VocabularyRouter.getById);
router.post('/vocabulary', vocabularyValidationMiddleware, vocabularyAuthorizationMiddleware, VocabularyRouter.create);
router.patch('/vocabulary/:vocabulary', vocabularyValidationMiddleware, vocabularyAuthorizationMiddleware, VocabularyRouter.update);
router.delete('/vocabulary/:vocabulary', vocabularyAuthorizationMiddleware, VocabularyRouter.delete);

// get by ids (to include queries)
router.post('/dataset/vocabulary/get-by-ids', VocabularyRouter.getByIds);
router.post('/dataset/:dataset/widget/vocabulary/get-by-ids', VocabularyRouter.getByIds);
router.post('/dataset/:dataset/layer/vocabulary/get-by-ids', VocabularyRouter.getByIds);

module.exports = router;
