const Router = require('koa-router');
const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const FavouriteSerializer = require('serializers/favourite.serializer');
const FavouriteModel = require('models/favourite.model');
const FavouriteValidator = require('validators/favourite.validator');
const GraphService = require('services/graph.service');
const UserService = require('../../../services/user.service');

const router = new Router({
    prefix: '/favourite'
});

class FavouriteRouter {

    static async get(ctx) {
        logger.info('Obtaining favourites by user');
        const application = ctx.query.application || ctx.query.app || 'rw';
        const filters = {
            userId: JSON.parse(ctx.query.loggedUser).id,
            application
        };
        if (ctx.query['resource-type']) {
            filters.resourceType = {
                $in: ctx.query['resource-type'].split(',')
            };
        }

        const data = await FavouriteModel.find(filters);

        if (ctx.query.include && ctx.query.include === 'true') {
            logger.debug('including resources');
            const widgets = [];
            const datasets = [];
            const layers = [];
            data.forEach((resource) => {
                if (resource.resourceType === 'dataset') {
                    datasets.push(resource.resourceId);
                } else if (resource.resourceType === 'layer') {
                    layers.push(resource.resourceId);
                } else {
                    widgets.push(resource.resourceId);
                }
            });

            try {
                if (datasets.length > 0) {
                    logger.debug('Loading datasets');
                    const datasetResources = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/dataset?ids=${datasets.join(',')}`,
                        method: 'GET',
                        json: true
                    });
                    for (let i = 0, { length } = datasetResources.data; i < length; i++) {
                        const dataset = datasetResources.data[i];
                        for (let j = 0, lengthData = data.length; j < lengthData; j++) {
                            if (data[j].resourceType === 'dataset' && data[j].resourceId === dataset.id) {
                                data[j] = data[j].toObject();
                                data[j].resource = dataset;
                                break;
                            }
                        }
                    }
                }
                logger.debug('Loading widgets', widgets);
                if (widgets.length > 0) {
                    logger.debug('Loading widgets', widgets);
                    const widgetResources = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/widget?ids=${widgets.join(',')}`,
                        method: 'GET',
                        json: true
                    });
                    logger.info('Obtained', widgetResources);
                    for (let i = 0, { length } = widgetResources.data; i < length; i++) {
                        const widget = widgetResources.data[i];
                        for (let j = 0, lengthData = data.length; j < lengthData; j++) {
                            if (data[j].resourceType === 'widget' && data[j].resourceId === widget.id) {
                                data[j] = data[j].toObject();
                                data[j].resource = widget;
                                break;
                            }
                        }
                    }
                }
                logger.info('Loading layers', layers);
                if (layers.length > 0) {
                    logger.info('Loading layers', layers);
                    for (let i = 0, { length } = layers; i < length; i++) {
                        try {
                            const layerResource = await RWAPIMicroservice.requestToMicroservice({
                                uri: `/v1/layer/${layers[i]}`,
                                method: 'GET',
                                json: true
                            });
                            for (let j = 0, lengthData = data.length; j < lengthData; j++) {
                                if (data[j].resourceType === 'layer' && data[j].resourceId === layers[i]) {
                                    data[j] = data[j].toObject();
                                    data[j].resource = layerResource.data;
                                    break;
                                }
                            }
                        } catch (err) {
                            logger.error(err);
                        }
                    }
                }
            } catch (err) {
                logger.error(err);
                ctx.throw(400, 'Error obtaining include');
            }
        }

        ctx.body = FavouriteSerializer.serialize(data);

    }

    static async findByUser(ctx) {
        logger.info('Obtaining favs by user');
        if (!ctx.request.body.userId) {
            ctx.throw(400, 'Bad Request');
            return;
        }
        const filters = {
            application: ctx.request.body.app || ctx.request.body.application || 'rw',
            userId: ctx.request.body.userId
        };

        if (ctx.request.body.application === 'all') {
            delete filters.application;
        }

        const data = await FavouriteModel.find(filters);
        ctx.body = FavouriteSerializer.serialize(data);
    }

    static async getById(ctx) {
        logger.info('Obtaining favourite by id', ctx.params.id);
        ctx.body = FavouriteSerializer.serialize(ctx.state.fav);
    }

    static async create(ctx) {
        logger.info('Creating favourite with body ', ctx.request.body);
        const body = {
            userId: ctx.request.body.loggedUser.id,
            resourceType: ctx.request.body.resourceType,
            resourceId: ctx.request.body.resourceId,
            application: ctx.request.body.application
        };
        const data = await new FavouriteModel(body).save();
        try {
            await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/graph/favourite/${ctx.request.body.resourceType}/${ctx.request.body.resourceId}/${ctx.request.body.loggedUser.id}`,
                method: 'POST',
                json: true
            });
        } catch (err) {
            logger.error(err);
        }
        ctx.body = FavouriteSerializer.serialize(data);
    }

    static async delete(ctx) {
        logger.info('Deleting favourite with id ', ctx.params.id);
        ctx.assert(ctx.params.id.length === 24, 400, 'Id not valid');
        await GraphService.removeFromGraph(ctx.state.fav);
        await ctx.state.fav.remove();
        ctx.body = FavouriteSerializer.serialize(ctx.state.fav);
    }

    static async deleteByUserId(ctx) {
        const userIdToDelete = ctx.params.userId;

        try {
            await UserService.getUserById(userIdToDelete);
        } catch (error) {
            ctx.throw(404, `User ${userIdToDelete} does not exist`);
        }

        logger.info(`[FavouriteRouter] Deleting all favourites for user with id: ${userIdToDelete}`);
        try {
            const userFavourites = await FavouriteModel.find({ userId: { $eq: userIdToDelete } }).exec();
            if (userFavourites) {
                for (let i = 0, { length } = userFavourites; i < length; i++) {
                    const currentFavourite = userFavourites[i];

                    await GraphService.removeFromGraph(currentFavourite);

                    logger.info(`[DBACCESS-DELETE]: favourite.id: ${currentFavourite._id}`);
                    await currentFavourite.remove();
                }
            }
            ctx.body = FavouriteSerializer.serialize(userFavourites);
        } catch (err) {
            logger.error(`Error deleting favourites from user ${userIdToDelete}`, err);
            ctx.throw(500, `Error deleting favourites from user ${userIdToDelete}`);
        }
    }

}

const existFavourite = async (ctx, next) => {
    logger.debug('Checking if exist favourite');
    const loggedUser = JSON.parse(ctx.query.loggedUser);
    const fav = await FavouriteModel.findById(ctx.params.id);
    if (!fav || ((loggedUser.id !== fav.userId) && loggedUser.role !== 'ADMIN')) {
        ctx.throw(404, 'Favourite not found');
        return;
    }
    ctx.state.fav = fav;
    await next();
};

const validationMiddleware = async (ctx, next) => {
    logger.info(`[DatasetRouter] Validating`);
    try {
        await FavouriteValidator.validate(ctx);
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

const deleteResourceAuthorizationMiddleware = async (ctx, next) => {
    logger.info(`[FavouriteRouter] Checking authorization`);
    const { query, body } = ctx.request;
    const user = { ...(query.loggedUser ? JSON.parse(query.loggedUser) : {}), ...body.loggedUser };
    const userFromParam = ctx.params.userId;

    if (user.id === 'microservice' || user.role === 'ADMIN') {
        await next();
        return;
    }

    if (userFromParam === user.id) {
        await next();
        return;
    }

    ctx.throw(403, 'Forbidden');
};

router.get('/', isAuthenticatedMiddleware, FavouriteRouter.get);
router.get('/:id', isAuthenticatedMiddleware, existFavourite, FavouriteRouter.getById);
router.post('/find-by-user', isAuthenticatedMiddleware, FavouriteRouter.findByUser);
router.post('/', isAuthenticatedMiddleware, validationMiddleware, FavouriteRouter.create);
router.delete('/by-user/:userId', isAuthenticatedMiddleware, deleteResourceAuthorizationMiddleware, FavouriteRouter.deleteByUserId);
router.delete('/:id', isAuthenticatedMiddleware, existFavourite, FavouriteRouter.delete);

module.exports = router;
