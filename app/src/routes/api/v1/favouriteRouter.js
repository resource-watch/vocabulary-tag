const Router = require('koa-router');
const logger = require('logger');
const FavouriteSerializer = require('serializers/favouriteSerializer');
const FavouriteModel = require('models/favourite');
const FavouriteValidator = require('validators/favouriteValidator');

const router = new Router({
    prefix: '/favourite'
});

class FavouriteRouter {

    static* get() {
        logger.info('Obtaining favourites by user');
        const filters = {
            userId: JSON.parse(this.query.loggedUser).id
        };
        if (this.query['resource-type']) {
            filters.resourceType = {
                $in: this.query['resource-type'].split(',')
            };
        }

        const data = yield FavouriteModel.find(filters);

        this.body = FavouriteSerializer.serialize(data);

    }

    static* getById() {
        logger.info('Obtaining favourite by id', this.params.id);
        this.body = FavouriteSerializer.serialize(this.state.fav);
    }

    static* create() {
        logger.info('Creating favourite with body ', this.request.body);
        const body = {
            userId: this.request.body.loggedUser.id,
            resourceType: this.request.body.resourceType,
            resourceId: this.request.body.resourceId
        };
        const data = yield new FavouriteModel(body).save();
        this.body = FavouriteSerializer.serialize(data);
    }

    static* delete() {
        logger.info('Deleting favourite with id ', this.params.id);
        yield this.state.fav.remove();
        this.body = FavouriteSerializer.serialize(this.state.fav);
    }

}

const existFavourite = function* (next) {
    logger.debug('Checking if exist favourite');
    const loggedUser = JSON.parse(this.query.loggedUser);
    const fav = yield FavouriteModel.findById(this.params.id);
    if (!fav || ((loggedUser.id !== fav.userId) && loggedUser.role !== 'ADMIN')) {
        this.throw(404, 'Favourite not found');
        return;
    }
    this.state.fav = fav;
    yield next;
};


router.get('/', FavouriteRouter.get);
router.get('/:id', existFavourite, FavouriteRouter.getById);
router.post('/', FavouriteValidator.validate, FavouriteRouter.create);
router.delete('/:id', existFavourite, FavouriteRouter.delete);

module.exports = router;
