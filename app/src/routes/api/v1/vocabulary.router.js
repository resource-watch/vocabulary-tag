const Router = require('koa-router');
const logger = require('logger');
const VocabularyService = require('services/vocabulary.service');
const ResourceService = require('services/resource.service');
const RelationshipService = require('services/relationship.service');
const VocabularySerializer = require('serializers/vocabulary.serializer');
const ResourceSerializer = require('serializers/resource.serializer');
const VocabularyValidator = require('validators/vocabulary.validator');
const RelationshipValidator = require('validators/relationship.validator');
const CloneValidator = require('validators/clone.validator');
const RelationshipsValidator = require('validators/relationships.validator');
const VocabularyNotFound = require('errors/vocabulary-not-found.error');
const VocabularyDuplicated = require('errors/vocabulary-duplicated.error');
const VocabularyNotValid = require('errors/vocabulary-not-valid.error');
const RelationshipDuplicated = require('errors/relationship-duplicated.error');
const RelationshipNotValid = require('errors/relationship-not-valid.error');
const CloneNotValid = require('errors/clone-not-valid.error');
const RelationshipsNotValid = require('errors/relationships-not-valid.error');
const RelationshipNotFound = require('errors/relationship-not-found.error');
const ResourceNotFound = require('errors/resource-not-found.error');
const { USER_ROLES } = require('app.constants');

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

    static async get(ctx) {
        const { query } = ctx.request;
        const queryKeys = Object.keys(query).filter((e) => e !== 'loggedUser');
        if (queryKeys.length === 0) {
            ctx.throw(400, 'Vocabulary and Tags are required in the queryParams');
            return;
        }
        logger.info(`Getting resources by vocabulary-tag`);
        const resource = {};
        resource.type = VocabularyRouter.getResourceTypeByPath(ctx.path);
        const result = await VocabularyService.get(resource, query);
        // Default cache
        ctx.body = VocabularySerializer.serialize(result);
    }

    static async create(ctx) {
        logger.info(`Creating vocabulary with name: ${ctx.request.body.name}`);
        try {
            const user = ctx.request.body.loggedUser;
            const result = await VocabularyService.create(user, ctx.request.body);
            ctx.set('uncache', 'vocabulary');
            ctx.body = VocabularySerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyDuplicated) {
                ctx.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    // static async update(ctx) {
    //     logger.info(`Updating vocabulary with name: ${ctx.request.body.name}`);
    //     try {
    //         const user = ctx.request.body.loggedUser;
    //         const result = await VocabularyService.update(user, ctx.request.body);
    //         ctx.set('uncache', 'vocabulary ${ctx.params.vocabulary}')
    //         ctx.body = VocabularySerializer.serialize(result);
    //     } catch (err) {
    //         if (err instanceof VocabularyNotFound) {
    //             ctx.throw(400, err.message);
    //             return;
    //         } else if (err instanceof ConsistencyViolation) {
    //             ctx.throw(409, err.message);
    //             return;
    //         }
    //         throw err;
    //     }
    // }
    //
    // static async delete(ctx) {
    //     logger.info(`Updating vocabulary with name: ${ctx.request.body.name}`);
    //     try {
    //         const user = ctx.request.body.loggedUser;
    //         const result = await VocabularyService.delete(user, ctx.request.body);
    //         ctx.set('uncache', 'vocabulary ${ctx.params.vocabulary}')
    //         ctx.body = VocabularySerializer.serialize(result);
    //     } catch (err) {
    //         if (err instanceof VocabularyNotFound) {
    //             ctx.throw(400, err.message);
    //             return;
    //         } else if (err instanceof ConsistencyViolation) {
    //             ctx.throw(400, err.message);
    //             return;
    //         }
    //         throw err;
    //     }
    // }

    static async getAll(ctx) {
        logger.info('Getting all vocabularies');
        const filter = {};
        if (ctx.query.limit) { filter.limit = ctx.query.limit; }
        filter.env = ctx.query.env ? ctx.query.env : 'production';
        const result = await VocabularyService.getAll(filter);
        ctx.set('cache', 'vocabulary');
        ctx.body = VocabularySerializer.serialize(result);
    }

    static async getById(ctx) {
        logger.info(`Getting vocabulary by name: ${ctx.params.vocabulary}`);
        const application = ctx.query.application || ctx.query.app || 'rw';
        const env = ctx.query.env ? ctx.query.env : 'production';
        const vocabulary = { name: ctx.params.vocabulary, application, env };
        const result = await VocabularyService.getById(vocabulary);
        ctx.set('cache', `${vocabulary.name} ${result.id}`);
        ctx.body = VocabularySerializer.serialize(result);
    }

    static async getTagsById(ctx) {
        logger.info(`Getting vocabulary tags by name: ${ctx.params.vocabulary}`);
        const application = ctx.query.application || ctx.query.app || 'rw';
        const env = ctx.query.env ? ctx.query.env : 'production';
        const vocabulary = { name: ctx.params.vocabulary, application, env };
        const result = await VocabularyService.getById(vocabulary);
        ctx.body = VocabularySerializer.serializeTags(result);
    }

    /* Using the Resource Service */
    static async getByResource(ctx) {
        const resource = VocabularyRouter.getResource(ctx.params);
        logger.info(`Getting vocabularies of ${resource.type}: ${resource.id}`);
        const application = ctx.query.application || ctx.query.app || 'rw';
        const vocabulary = { name: ctx.params.vocabulary, application };
        const result = await ResourceService.get(ctx.params.dataset, resource, vocabulary);
        ctx.set('cache', `${resource.id}-vocabulary-all`);
        ctx.body = ResourceSerializer.serialize(result);
    }

    static async findByIds(ctx) {
        if (!ctx.request.body.ids) {
            ctx.throw(400, 'Bad request - Missing \'ids\' from request body');
            return;
        }
        logger.info(`Getting vocabularies by ids: ${ctx.request.body.ids}`);
        const resource = {
            ids: ctx.request.body.ids
        };
        if (ctx.query.application) {
            resource.application = ctx.query.application;
        }
        if (typeof resource.ids === 'string') {
            resource.ids = resource.ids.split(',').map((elem) => elem.trim());
        }
        resource.type = VocabularyRouter.getResourceTypeByPath(ctx.path);
        const result = await ResourceService.getByIds(resource);
        // no cache
        ctx.body = ResourceSerializer.serializeByIds(result); //
    }

    static async createRelationship(ctx) {
        const { dataset } = ctx.params;
        const application = ctx.request.body.application || 'rw';
        const vocabulary = { name: ctx.params.vocabulary, application };
        const resource = VocabularyRouter.getResource(ctx.params);
        const { body } = ctx.request;
        logger.info(`Creating relationship between vocabulary: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        try {
            const user = ctx.request.body.loggedUser;
            const result = await RelationshipService.create(user, vocabulary, dataset, resource, body);
            ctx.set('uncache', `vocabulary ${resource.id}-vocabulary ${resource.id}-vocabulary-all ${vocabulary.name}`);
            ctx.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof RelationshipDuplicated) {
                ctx.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static async createRelationships(ctx) {
        const { dataset } = ctx.params;
        const resource = VocabularyRouter.getResource(ctx.params);
        const { body } = ctx.request;
        const vocabularies = [];
        Object.keys(body).forEach((key) => {
            if (key !== 'loggedUser') {
                vocabularies.push({
                    name: key,
                    application: body[key].application,
                    tags: body[key].tags
                });
            }
        });
        vocabularies.forEach((vocabulary) => {
            logger.info(`Creating relationships between vocabulary: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        });
        try {
            const user = ctx.request.body.loggedUser;
            const result = await RelationshipService.createSome(user, vocabularies, dataset, resource);
            ctx.set('uncache', `vocabulary ${resource.id}-vocabulary ${resource.id}-vocabulary-all ${vocabularies.map((el) => `${el.name}`).join(' ')}`);
            ctx.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof RelationshipDuplicated) {
                ctx.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static async updateRelationships(ctx) {
        const { dataset } = ctx.params;
        const resource = VocabularyRouter.getResource(ctx.params);
        const { body } = ctx.request;
        logger.info(`Deleting All Vocabularies of resource: ${resource.type} - ${resource.id}`);
        try {
            const user = ctx.request.body.loggedUser;
            const result = await RelationshipService.deleteAll(user, dataset, resource);
            ctx.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound) {
                ctx.throw(404, err.message);
                return;
            } if (err instanceof RelationshipNotFound) {
                // do nothing
            } else {
                throw err;
            }
        }
        const vocabularies = [];
        Object.keys(body).forEach((key) => {
            if (key !== 'loggedUser') {
                vocabularies.push({
                    name: key,
                    application: body[key].application,
                    tags: body[key].tags
                });
            }
        });
        vocabularies.forEach((vocabulary) => {
            logger.info(`Creating relationships between vocabulary: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        });
        try {
            const user = ctx.request.body.loggedUser;
            const result = await RelationshipService.createSome(user, vocabularies, dataset, resource);
            ctx.set('uncache', `vocabulary ${resource.id}-vocabulary ${resource.id}-vocabulary-all ${vocabularies.map((el) => `${el.name}`).join(' ')}`);
            ctx.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof RelationshipDuplicated) {
                ctx.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static async deleteRelationship(ctx) {
        const { dataset } = ctx.params;
        const application = ctx.query.application || ctx.query.app || 'rw';
        const vocabulary = { name: ctx.params.vocabulary, application };
        const resource = VocabularyRouter.getResource(ctx.params);
        logger.info(`Deleting Relationship between: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        try {
            const user = ctx.request.body.loggedUser;
            const result = await RelationshipService.delete(user, vocabulary, dataset, resource);
            ctx.set('uncache', `vocabulary ${resource.id}-vocabulary ${resource.id}-vocabulary-all ${vocabulary.name}`);
            ctx.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound) {
                ctx.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static async deleteRelationships(ctx) {
        const { dataset } = ctx.params;
        const resource = VocabularyRouter.getResource(ctx.params);
        logger.info(`Deleting All Vocabularies of resource: ${resource.type} - ${resource.id}`);
        try {
            const user = ctx.request.body.loggedUser;
            const result = await RelationshipService.deleteAll(user, dataset, resource);
            logger.debug(result);
            ctx.set('uncache', `vocabulary ${resource.id}-vocabulary ${resource.id}-vocabulary-all ${result.vocabularies.map((el) => `${el.id}`).join(' ')}`);
            ctx.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound) {
                ctx.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static async updateRelationshipTags(ctx) {
        const { dataset } = ctx.params;
        const application = ctx.request.body.application || 'rw';
        const vocabulary = { name: ctx.params.vocabulary, application };
        const resource = VocabularyRouter.getResource(ctx.params);
        const { body } = ctx.request;
        logger.info(`Updating tags of relationship: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        try {
            const user = ctx.request.body.loggedUser;
            const result = await RelationshipService.updateTagsFromRelationship(user, vocabulary, dataset, resource, body);
            ctx.set('uncache', `vocabulary ${resource.id}-vocabulary ${resource.id}-vocabulary-all ${vocabulary.name}`);
            ctx.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound) {
                ctx.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static async concatTags(ctx) {
        const { dataset } = ctx.params;
        const application = ctx.request.body.application || 'rw';
        const vocabulary = { name: ctx.params.vocabulary, application };
        const resource = VocabularyRouter.getResource(ctx.params);
        const { body } = ctx.request;
        logger.info(`Conacatenating more tags in relationship: ${vocabulary.name} and resource: ${resource.type} - ${resource.id}`);
        try {
            const user = ctx.request.body.loggedUser;
            const result = await RelationshipService.concatTags(user, vocabulary, dataset, resource, body);
            ctx.set('uncache', `vocabulary ${resource.id}-vocabulary ${resource.id}-vocabulary-all ${vocabulary.name}`);
            ctx.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound) {
                ctx.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static async cloneVocabularyTags(ctx) {
        const { dataset } = ctx.params;
        const resource = VocabularyRouter.getResource(ctx.params);
        const { body } = ctx.request;
        const { newDataset } = body;
        logger.info(`Cloning relationships: of resource ${resource.type} - ${resource.id} in ${newDataset}`);
        try {
            const user = ctx.request.body.loggedUser;
            const result = await RelationshipService.cloneVocabularyTags(user, dataset, resource, body);
            ctx.set('uncache', `vocabulary ${resource.id}-vocabulary ${resource.id}-vocabulary-all`);
            ctx.body = ResourceSerializer.serialize(result);
        } catch (err) {
            if (err instanceof VocabularyNotFound || err instanceof ResourceNotFound || err instanceof RelationshipNotFound) {
                ctx.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

}

// Negative checking
const relationshipAuthorizationMiddleware = async (ctx, next) => {
    // Get user from query (delete) or body (post-patch)
    const user = { ...(ctx.request.query.loggedUser ? JSON.parse(ctx.request.query.loggedUser) : {}), ...ctx.request.body.loggedUser };
    if (user.id === 'microservice') {
        await next();
        return;
    }
    if (!user || USER_ROLES.indexOf(user.role) === -1) {
        ctx.throw(401, 'Unauthorized'); // if not logged or invalid ROLE-> out
        return;
    }
    if (user.role === 'USER') {
        ctx.throw(403, 'Forbidden'); // if USER -> out
        return;
    }
    if (user.role === 'MANAGER' || user.role === 'ADMIN') {
        const resource = VocabularyRouter.getResource(ctx.params);
        const permission = await ResourceService.hasPermission(user, ctx.params.dataset, resource);
        if (!permission) {
            ctx.throw(403, 'Forbidden');
            return;
        }
    }
    await next(); // SUPERADMIN are included here
};

// Negative checking
const vocabularyAuthorizationMiddleware = async (ctx, next) => {
    // Get user from query (delete) or body (post-patch)
    const user = { ...(ctx.request.query.loggedUser ? JSON.parse(ctx.request.query.loggedUser) : {}), ...ctx.request.body.loggedUser };
    if (user.id === 'microservice') {
        await next();
        return;
    }
    if (!user || USER_ROLES.indexOf(user.role) === -1) {
        ctx.throw(401, 'Unauthorized'); // if not logged or invalid ROLE -> out
        return;
    }
    if (ctx.request.method === 'POST' && user.role === 'ADMIN') {
        await next();
        return;
    }
    if (user.role !== 'SUPERADMIN') {
        ctx.throw(403, 'Forbidden'); // Only SUPERADMIN
        return;
    }
    await next(); // SUPERADMIN is included here
};

// Resource Validator Wrapper
const relationshipValidationMiddleware = async (ctx, next) => {
    try {
        await RelationshipValidator.validate(ctx);
    } catch (err) {
        if (err instanceof RelationshipNotValid) {
            ctx.throw(400, err.getMessages());
            return;
        }
        throw err;
    }
    await next();
};

// RelationshipsValidator Wrapper
const relationshipsValidationMiddleware = async (ctx, next) => {
    try {
        await RelationshipsValidator.validate(ctx);
    } catch (err) {
        if (err instanceof RelationshipsNotValid) {
            ctx.throw(400, err.getMessages());
            return;
        }
        throw err;
    }
    await next();
};

// Vocabulary Validator Wrapper
const vocabularyValidationMiddleware = async (ctx, next) => {
    try {
        await VocabularyValidator.validate(ctx);
    } catch (err) {
        if (err instanceof VocabularyNotValid) {
            ctx.throw(400, err.getMessages());
            return;
        }
        throw err;
    }
    await next();
};

// Clone Validator Wrapper
const cloneValidationMiddleware = async (ctx, next) => {
    try {
        await CloneValidator.validate(ctx);
    } catch (err) {
        if (err instanceof CloneNotValid) {
            ctx.throw(400, err.getMessages());
            return;
        }
        throw err;
    }
    await next();
};

const isAuthenticatedMiddleware = async (ctx, next) => {
    logger.info(`Verifying if user is authenticated`);
    const { query, body } = ctx.request;

    const user = { ...(query.loggedUser ? JSON.parse(query.loggedUser) : {}), ...body.loggedUser };

    if (!user || !user.id) {
        ctx.throw(401, 'Unauthorized');
        return;
    }
    await next();
};

// dataset
router.get('/dataset/:dataset/vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/vocabulary/:vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/vocabulary/find', VocabularyRouter.get);
router.post('/dataset/:dataset/vocabulary', isAuthenticatedMiddleware, relationshipsValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationships);
router.put('/dataset/:dataset/vocabulary', isAuthenticatedMiddleware, relationshipsValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.updateRelationships);
router.post('/dataset/:dataset/vocabulary/:vocabulary', isAuthenticatedMiddleware, relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationship);
router.patch('/dataset/:dataset/vocabulary/:vocabulary', isAuthenticatedMiddleware, relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.updateRelationshipTags);
router.post('/dataset/:dataset/vocabulary/:vocabulary/concat', isAuthenticatedMiddleware, relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.concatTags);
router.post('/dataset/:dataset/vocabulary/clone/dataset', isAuthenticatedMiddleware, cloneValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.cloneVocabularyTags);
router.delete('/dataset/:dataset/vocabulary/:vocabulary', isAuthenticatedMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationship);
router.delete('/dataset/:dataset/vocabulary', isAuthenticatedMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationships);

// widget
router.get('/dataset/:dataset/widget/:widget/vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/widget/vocabulary/find', VocabularyRouter.get);
router.post('/dataset/:dataset/widget/:widget/vocabulary/', isAuthenticatedMiddleware, relationshipsValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationships);
router.post('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', isAuthenticatedMiddleware, relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationship);
router.patch('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', isAuthenticatedMiddleware, relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.updateRelationshipTags);
router.delete('/dataset/:dataset/widget/:widget/vocabulary/:vocabulary', isAuthenticatedMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationship);
router.delete('/dataset/:dataset/widget/:widget/vocabulary', isAuthenticatedMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationships);

// layer
router.get('/dataset/:dataset/layer/:layer/vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', VocabularyRouter.getByResource);
router.get('/dataset/:dataset/layer/vocabulary/find', VocabularyRouter.get);
router.post('/dataset/:dataset/layer/:layer/vocabulary', isAuthenticatedMiddleware, relationshipsValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationships);
router.post('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', isAuthenticatedMiddleware, relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.createRelationship);
router.patch('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', isAuthenticatedMiddleware, relationshipValidationMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.updateRelationshipTags);
router.delete('/dataset/:dataset/layer/:layer/vocabulary/:vocabulary', isAuthenticatedMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationship);
router.delete('/dataset/:dataset/layer/:layer/vocabulary', isAuthenticatedMiddleware, relationshipAuthorizationMiddleware, VocabularyRouter.deleteRelationships);

// vocabulary (not the common use case)
router.get('/vocabulary', VocabularyRouter.getAll);
router.get('/vocabulary/:vocabulary', VocabularyRouter.getById);
router.get('/vocabulary/:vocabulary/tags', VocabularyRouter.getTagsById);
router.post('/vocabulary', isAuthenticatedMiddleware, vocabularyValidationMiddleware, vocabularyAuthorizationMiddleware, VocabularyRouter.create);
// router.patch('/vocabulary/:vocabulary', isAuthenticatedMiddleware, vocabularyValidationMiddleware, vocabularyAuthorizationMiddleware, VocabularyRouter.update);
// router.delete('/vocabulary/:vocabulary', isAuthenticatedMiddleware, vocabularyAuthorizationMiddleware, VocabularyRouter.delete);

// find by ids (to include queries)
router.post('/dataset/vocabulary/find-by-ids', VocabularyRouter.findByIds);
router.post('/dataset/:dataset/widget/vocabulary/find-by-ids', VocabularyRouter.findByIds);
router.post('/dataset/:dataset/layer/vocabulary/find-by-ids', VocabularyRouter.findByIds);

module.exports = router;
