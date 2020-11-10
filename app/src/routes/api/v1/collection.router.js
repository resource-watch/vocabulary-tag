const Router = require('koa-router');
const logger = require('logger');
const ctRegisterMicroservice = require('sd-ct-register-microservice-node');
const CollectionModel = require('models/collection.model');
const CollectionSerializer = require('serializers/collection.serializer');
const CollectionValidator = require('validators/collection.validator');
const mongoose = require('mongoose');

const router = new Router({
    prefix: '/collection'
});

const getUser = (ctx) => {
    const { query, body } = ctx.request;

    let user = { ...(query.loggedUser ? JSON.parse(query.loggedUser) : {}), ...ctx.request.body.loggedUser };
    if (body.fields && body.fields.loggedUser) {
        user = Object.assign(user, JSON.parse(body.fields.loggedUser));
    }
    return user;
};

class CollectionRouter {

    static async getAll(ctx) {
        logger.info('Obtaining collection by user');

        if (!ctx.query.loggedUser) {
            logger.error('Unauthorized access');
            ctx.throw(401, 'Unauthorized');
        }

        const application = ctx.query.application || ctx.query.app || 'rw';
        const user = getUser(ctx);
        if (!user.role) {
            ctx.throw(401, 'Unauthorized');
            return;
        }
        const filters = {
            ownerId: user.id,
            application
        };
        let collections = await CollectionModel.find(filters);
        if (ctx.query.include && ctx.query.include === 'true') {
            logger.debug('including resources');
            const widgetIds = [];
            const datasetIds = [];
            const layerIds = [];

            const datasets = {};
            const widgets = {};
            const layers = {};

            // Compile a list of ids for the 3 resource types
            collections.forEach((collection) => {
                collection.resources.forEach((resource) => {
                    switch (resource.type) {

                        case 'dataset':
                            datasetIds.push(resource.id);
                            break;
                        case 'layer':
                            layerIds.push(resource.id);
                            break;
                        case 'widget':
                            widgetIds.push(resource.id);
                            break;
                        default:
                            logger.warn(`Unexpected collection resource of type ${resource.type}`);

                    }
                });
            });

            // Load all datasets by id
            try {
                if (datasetIds.length > 0) {
                    logger.debug('Loading datasets');
                    const getDatasetsResponse = await ctRegisterMicroservice.requestToMicroservice({
                        uri: `/dataset?ids=${datasetIds.join(',')}`,
                        method: 'GET',
                        json: true
                    });
                    getDatasetsResponse.data.forEach((dataset) => {
                        datasets[dataset.id] = dataset;
                    });
                }
            } catch (err) {
                logger.error(err);
                ctx.throw(400, 'Error obtaining included datasets');
            }

            // Load all widgets by id
            try {
                if (widgetIds.length > 0) {
                    logger.debug('Loading widgets');
                    const getWidgetsResponse = await ctRegisterMicroservice.requestToMicroservice({
                        uri: `/widget?ids=${widgetIds.join(',')}`,
                        method: 'GET',
                        json: true
                    });
                    getWidgetsResponse.data.forEach((widget) => {
                        widgets[widget.id] = widget;
                    });
                }
            } catch (err) {
                logger.error(err);
                ctx.throw(400, 'Error obtaining included widgets');
            }

            // Load all layers by id
            try {
                if (layerIds.length > 0) {
                    logger.debug('Loading layers');
                    const getLayersPromises = layerIds.map((layerId) => ctRegisterMicroservice.requestToMicroservice({
                        uri: `/layer/${layerId}`,
                        method: 'GET',
                        json: true
                    }));

                    const getLayersResponse = await Promise.all(getLayersPromises);
                    getLayersResponse.forEach((layerResponse) => {
                        layers[layerResponse.data.id] = layerResponse.data;
                    });
                }
            } catch (err) {
                logger.error(err);
                ctx.throw(400, 'Error obtaining included layers');
            }

            // Reconcile imported resources
            collections = collections.map((collectionModel) => {
                const collection = collectionModel.toObject();

                collection.resources = collection.resources.map((resource) => {
                    switch (resource.type) {

                        case 'dataset':
                            return datasets[resource.id];
                        case 'layer':
                            return layers[resource.id];
                        case 'widget':
                            return widgets[resource.id];
                        default:
                            logger.warn(`Unexpected collection resource of type ${resource.type}`);
                            return null;

                    }
                });

                return collection;
            });

        }
        ctx.body = CollectionSerializer.serialize(collections);
    }

    static async findByIds(ctx) {
        logger.info('Obtaining collection by user');

        if (typeof ctx.request.body.ids === 'string') {
            ctx.request.body.ids = [ctx.request.body.ids];
        }

        const filters = {
            _id: {
                $in: ctx.request.body.ids.filter(mongoose.Types.ObjectId.isValid)
            },
            ownerId: ctx.request.body.userId
        };

        if (ctx.query.application) {
            filters.application = ctx.query.application;
        }

        const data = await CollectionModel.find(filters);
        ctx.body = CollectionSerializer.serialize(data);
    }

    static async getById(ctx) {
        logger.info('Obtaining collection by id', ctx.params.id);
        ctx.body = CollectionSerializer.serialize(ctx.state.col);
    }

    static async postCollection(ctx) {
        logger.info('Creating collection with body ', ctx.request.body);
        const body = {
            name: ctx.request.body.name,
            application: ctx.request.body.application,
            ownerId: ctx.request.body.loggedUser.id,
            resources: ctx.request.body.resources || []
        };
        const data = await new CollectionModel(body).save();
        ctx.body = CollectionSerializer.serialize(data);
    }

    static async postResource(ctx) {
        logger.info('Creating new resource in collection with id ', ctx.params.id);
        ctx.state.col.resources.push(ctx.request.body);
        await ctx.state.col.save();
        ctx.body = CollectionSerializer.serialize(ctx.state.col);
    }

    static async patchCollection(ctx) {
        logger.info('Updating collection by id ', ctx.params.id);
        ctx.state.col.name = ctx.request.body.name;
        await ctx.state.col.save();
        ctx.body = CollectionSerializer.serialize(ctx.state.col);
    }

    static async deleteCollection(ctx) {
        logger.info('Deleting collection by id ', ctx.params.id);
        await ctx.state.col.remove();
        ctx.body = CollectionSerializer.serialize(ctx.state.col);
    }

    static async deleteResource(ctx) {
        ctx.state.col.resources = ctx.state.col.resources
            .filter((res) => res.id !== ctx.params.resourceId || res.type !== ctx.params.resourceType);
        await ctx.state.col.save();
        ctx.body = CollectionSerializer.serialize(ctx.state.col);
    }

}

const collectionExists = async (ctx, next) => {
    logger.debug('Checking if collection exists');
    let loggedUser;
    if (ctx.method === 'GET' || ctx.method === 'DELETE') {
        loggedUser = JSON.parse(ctx.query.loggedUser);
    } else {
        // eslint-disable-next-line prefer-destructuring
        loggedUser = ctx.request.body.loggedUser;
    }
    const col = await CollectionModel.findById(ctx.params.id);
    if (!col || ((loggedUser.id !== col.ownerId) && loggedUser.role !== 'ADMIN')) {
        ctx.throw(404, 'Collection not found');
        return;
    }
    ctx.state.col = col;
    await next();
};

const existResourceInCollection = async (ctx, next) => {
    logger.debug('Checking if resource exists in collection');
    const exist = ctx.state.col.resources.find((res) => res.id === ctx.request.body.id && res.type === ctx.request.body.type);
    if (exist) {
        ctx.throw(400, 'Resource duplicated');
        return;
    }
    await next();
};

const findByIdValidationMiddleware = async (ctx, next) => {
    logger.info(`[CollectionRouter] Validating`);
    try {
        ctx.checkBody('ids').notEmpty().check(
            () => ((ctx.request.body.ids instanceof Array || typeof ctx.request.body.ids === 'string') && ctx.request.body.ids.length > 0),
            '\'ids\' must be a non-empty array or string'
        );
        ctx.checkBody('userId').notEmpty();
    } catch (err) {
        ctx.throw(400, err);
    }

    if (ctx.errors) {
        logger.error('Validation error');
        ctx.throw(400, JSON.stringify(ctx.errors));
    }

    await next();
};

const validationMiddleware = async (ctx, next) => {
    logger.info(`[CollectionRouter] Validating`);
    try {
        await CollectionValidator.validate(ctx);
    } catch (err) {
        ctx.throw(400, err);
    }
    await next();
};

router.get('/', CollectionRouter.getAll);
router.get('/:id', collectionExists, CollectionRouter.getById);

router.post('/', validationMiddleware, CollectionRouter.postCollection);
router.post('/:id/resource', collectionExists, existResourceInCollection, CollectionRouter.postResource);
router.post('/find-by-ids', findByIdValidationMiddleware, CollectionRouter.findByIds);

router.patch('/:id', collectionExists, CollectionRouter.patchCollection);

router.delete('/:id', collectionExists, CollectionRouter.deleteCollection);
router.delete('/:id/resource/:resourceType/:resourceId', collectionExists, CollectionRouter.deleteResource);

module.exports = router;
