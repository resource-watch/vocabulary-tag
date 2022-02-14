const Router = require('koa-router');
const logger = require('logger');
const CollectionModel = require('models/collection.model');
const CollectionSerializer = require('serializers/collection.serializer');
const CollectionValidator = require('validators/collection.validator');
const CollectionService = require('services/collection.service');
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
    if ('x-rw-domain' in ctx.request.header) {
        return ctx.request.header['x-rw-domain'];
    }
    if ('referer' in ctx.request.header) {
        const url = new URL(ctx.request.header.referer);
        return url.host;
    }
    return ctx.request.host;
};

class CollectionRouter {

    static async getAll(ctx) {
        logger.info('Obtaining collection by user');

        if (!ctx.query.loggedUser) {
            logger.error('Unauthorized access');
            ctx.throw(401, 'Unauthorized');
        }

        const user = getUser(ctx);
        if (!user.role) {
            ctx.throw(401, 'Unauthorized');
            return;
        }

        const { query } = ctx;
        const collections = await CollectionService.getAll(query, user);

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
            env: ctx.request.body.env || 'production',
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
        ctx.state.col.env = ctx.request.body.env;
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
