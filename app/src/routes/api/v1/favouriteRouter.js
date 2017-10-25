const Router = require('koa-router');
const logger = require('logger');
const FavouriteSerializer = require('serializers/favouriteSerializer');
const FavouriteModel = require('models/favourite');
const FavouriteValidator = require('validators/favouriteValidator');
const ctRegisterMicroservice = require('ct-register-microservice-node');

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

        if (this.query.include && this.query.include === 'true') {
            logger.debug('including resources');
            let widgets = [];
            let datasets = [];
            let layers = [];
            data.map(resource => {
                if (resource.resourceType === 'dataset') {
                    datasets.push(resource.resourceId);
                } else if (resource.resourceType === 'layer') {
                    layers.push(resource.resourceId);
                } else {
                    widgets.push(resource.resourceId);
                }
            });
            
            try {
                if (datasets.length > 0){
                    logger.debug('Loading datasets');
                    const datasetResources = yield ctRegisterMicroservice.requestToMicroservice({
                        uri: `/dataset?ids=${datasets.join(',')}`,
                        method: 'GET',
                        json: true
                    });
                    for (let i = 0, length = datasetResources.data.length; i < length; i++) {
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
                if (widgets.length > 0){
                    logger.debug('Loading widgets', widgets);
                    const widgetResources = yield ctRegisterMicroservice.requestToMicroservice({
                        uri: `/widget?ids=${widgets.join(',')}`,
                        method: 'GET',
                        json: true
                    });
                    logger.info('Obtained', widgetResources);

                    for (let i = 0, length = widgetResources.data.length; i < length; i++) {
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
                if (layers.length > 0){
                    logger.info('Loading layers', layers);
                    for(let i = 0, length = layers.length; i < length; i++) {
                        try {
                            const layerResource = yield ctRegisterMicroservice.requestToMicroservice({
                                uri: `/layer/${layers[i]}`,
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
                        } catch(err) {
                            logger.error(err);
                        }
                    }                
                }
            } catch (err) {
                logger.error(err);
                this.throw(400, 'Error obtaining include');
            }
        }

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

        try {
            yield ctRegisterMicroservice.requestToMicroservice({
                uri: `/graph/favourite/${this.request.body.resourceType}/${this.request.body.resourceId}/${this.request.body.loggedUser.id}`,
                method: 'POST',
                json: true
            });
        } catch (err) {
            logger.error(err);
        }
        this.body = FavouriteSerializer.serialize(data);
    }

    static* delete() {
        logger.info('Deleting favourite with id ', this.params.id);
        this.assert(this.params.id.length !== 24, 400, 'Id not valid');
        try {
            yield ctRegisterMicroservice.requestToMicroservice({
                uri: `/graph/favourite/${this.state.fav.resourceType}/${this.state.fav.resourceId}/${this.state.fav.id}`,
                method: 'DELETE',
                json: true
            });
        } catch (err) {
            logger.error('error removing of graph', err);
        }
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
