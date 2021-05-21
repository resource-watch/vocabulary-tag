const Router = require('koa-router');
const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
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

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

const getHostForPaginationLink = (ctx) => {
    if ('referer' in ctx.request.header) {
        const url = new URL(ctx.request.header.referer);
        return url.host;
    }
    return ctx.request.host;
};

function getFilteredSort(sort) {
    const sortParams = sort.split(',');
    const filteredSort = {};
    const areaAttributes = Object.keys(CollectionModel.schema.obj);
    sortParams.forEach((param) => {
        let sign = param.substr(0, 1);
        let signlessParam = param.substr(1);
        if (sign !== '-' && sign !== '+') {
            signlessParam = param;
            sign = '+';
        }
        if (areaAttributes.indexOf(signlessParam) >= 0) {
            filteredSort[signlessParam] = parseInt(sign + 1, 10);
        }
    });
    return filteredSort;
}

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

        const { query } = ctx;
        const sort = ctx.query.sort || '';

        const page = query['page[number]'] ? parseInt(query['page[number]'], 10) : 1;
        const limit = query['page[size]'] ? parseInt(query['page[size]'], 10) : 9999999;

        const filteredSort = getFilteredSort(sort);

        const options = {
            page,
            limit,
            sort: filteredSort
        };
        const collections = await CollectionModel.paginate(filters, options);

        if (ctx.query.include && ctx.query.include === 'true') {
            logger.debug('including resources');
            const widgetIds = [];
            const datasetIds = [];
            const layerIds = [];

            const datasets = {};
            const widgets = {};
            const layers = {};

            // Compile a list of ids for the 3 resource types
            collections.docs.forEach((collection) => {
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
                    const getDatasetsResponse = await RWAPIMicroservice.requestToMicroservice({
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
                    const getWidgetsResponse = await RWAPIMicroservice.requestToMicroservice({
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
                    const getLayersPromises = layerIds.map((layerId) => RWAPIMicroservice.requestToMicroservice({
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
            collections.docs = collections.docs.map((collectionModel) => {
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

        const clonedQuery = { ...query };
        delete clonedQuery['page[size]'];
        delete clonedQuery['page[number]'];
        delete clonedQuery.loggedUser;

        const serializedQuery = serializeObjToQuery(clonedQuery) ? `?${serializeObjToQuery(clonedQuery)}&` : '?';
        const apiVersion = ctx.mountPath.split('/')[ctx.mountPath.split('/').length - 1];
        const link = `${ctx.request.protocol}://${getHostForPaginationLink(ctx)}/${apiVersion}${ctx.request.path}${serializedQuery}`;

        ctx.body = CollectionSerializer.serialize(collections, link);
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

router.get('/', isAuthenticatedMiddleware, CollectionRouter.getAll);
router.get('/:id', isAuthenticatedMiddleware, collectionExists, CollectionRouter.getById);

router.post('/', isAuthenticatedMiddleware, validationMiddleware, CollectionRouter.postCollection);
router.post('/:id/resource', isAuthenticatedMiddleware, collectionExists, existResourceInCollection, CollectionRouter.postResource);
router.post('/find-by-ids', findByIdValidationMiddleware, CollectionRouter.findByIds);

router.patch('/:id', isAuthenticatedMiddleware, collectionExists, CollectionRouter.patchCollection);

router.delete('/:id', isAuthenticatedMiddleware, collectionExists, CollectionRouter.deleteCollection);
router.delete('/:id/resource/:resourceType/:resourceId', isAuthenticatedMiddleware, collectionExists, CollectionRouter.deleteResource);

module.exports = router;
